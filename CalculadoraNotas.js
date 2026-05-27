const $ = id => document.getElementById(id);
let estudiantes = [], porcentajes = [0, 0, 0];
const STORAGE_KEY = "calculadoraNotas";
const guardarDatos = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ estudiantes, porcentajes }));
const cargarDatos = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const datos = JSON.parse(saved);
        if (Array.isArray(datos.estudiantes)) {
            estudiantes = datos.estudiantes.map(est => ({
                ...est,
                c1: est.c1 == null ? null : Number(est.c1),
                c2: est.c2 == null ? null : Number(est.c2),
                c3: est.c3 == null ? null : Number(est.c3)
            }));
        }
        if (Array.isArray(datos.porcentajes) && datos.porcentajes.length === 3) {
            porcentajes = datos.porcentajes.map(p => Number(p) || 0);
        }
    } catch {}
};
let mensajeTimeout;
const mostrarMensaje = (texto, tipo = "error") => {
    const cont = $("mensaje");
    if (!cont) return;
    clearTimeout(mensajeTimeout);
    cont.textContent = texto;
    cont.className = `mensaje mensaje--${tipo}`;
    mensajeTimeout = setTimeout(() => {
        cont.textContent = "";
        cont.className = "mensaje";
    }, 5000);
};
const parseNota = val => {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
};
const validarNota = (val, input) => {
    const num = parseNota(val);
    if (num == null) return null;
    if (num < 0 || num > 5) {
        mostrarMensaje(num < 0 ? "No se permiten notas negativas" : "La nota no puede ser mayor a 5");
        input.value = "";
        return null;
    }
    return num;
};
const actualizarEncabezados = () => ["c1", "c2", "c3"].forEach((c, i) => $("th-" + c).textContent = `${c.toUpperCase()} (${porcentajes[i]}%)`);
const leerPorcentajes = () => {
    const p = [1, 2, 3].map(i => parseFloat($(`corte${i}-porcentaje`).value) || 0);
    if (p.some(v => v < 0)) { mostrarMensaje("Los porcentajes no pueden ser negativos"); return null; }
    if (p.reduce((a, b) => a + b, 0) !== 100) { mostrarMensaje("Los porcentajes deben sumar exactamente 100%"); return null; }
    return p;
};
$("porcentaje-form").addEventListener("submit", e => {
    e.preventDefault();
    const p = leerPorcentajes();
    if (!p) return;
    porcentajes = p;
    actualizarEncabezados();
    renderTabla();
});
$("estudiante-form").addEventListener("submit", e => {
    e.preventDefault();
    const codigo = $("codigo").value.trim();
    if (estudiantes.some(est => est.codigo === codigo)) {
        mostrarMensaje("Ya existe un estudiante con ese código");
        return;
    }
    estudiantes.push({
        nombre: $("nombre").value.trim(),
        codigo,
        c1: validarNota($("corte1").value, $("corte1")),
        c2: validarNota($("corte2").value, $("corte2")),
        c3: validarNota($("corte3").value, $("corte3"))
    });
    e.target.reset();
    renderTabla();
});
const calcularDef = e => (e.c1 == null || e.c2 == null || e.c3 == null) ? null : ((e.c1 * porcentajes[0] + e.c2 * porcentajes[1] + e.c3 * porcentajes[2]) / 100).toFixed(2);
const calcularNecesaria = (e, objetivo) => {
    const suma = [e.c1, e.c2, e.c3].reduce((s, n, i) => s + (n != null ? n * porcentajes[i] / 100 : 0), 0);
    const peso = [e.c1, e.c2, e.c3].reduce((s, n, i) => s + (n == null ? porcentajes[i] : 0), 0);
    if (peso === 0) return "N/A";
    const necesaria = (objetivo - suma) / (peso / 100);
    return necesaria > 5 ? "Imposible" : necesaria < 0 ? "0.0" : necesaria.toFixed(2);
};
const crearInput = (valor, campo, e) => {
    const input = document.createElement("input");
    input.type = "number";
    input.value = valor ?? "";
    input.style.width = "60px";
    input.step = "any";
    input.min = 0;
    input.max = 5;
    input.onchange = () => {
        e[campo] = validarNota(input.value, input);
        renderTabla();
    };
    return input;
};
const ordenarEstudiantes = () => estudiantes.sort((a, b) => {
    const na = Number(a.codigo), nb = Number(b.codigo);
    return !isNaN(na) && !isNaN(nb) ? na - nb : a.codigo.localeCompare(b.codigo);
});
const renderTabla = () => {
    const tbody = document.querySelector("#estudiantes-table tbody");
    tbody.innerHTML = "";
    ordenarEstudiantes();
    estudiantes.forEach((e, i) => {
        const def = calcularDef(e);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${e.nombre}</td>
            <td>${e.codigo}</td>
            <td></td>
            <td></td>
            <td></td>
            <td>${def ?? "Pendiente"}</td>
            <td>${def ? "N/A" : calcularNecesaria(e, 3)}</td>
            <td>${def ? "N/A" : calcularNecesaria(e, 5)}</td>
            <td></td>
        `;
        tr.children[2].appendChild(crearInput(e.c1, "c1", e));
        tr.children[3].appendChild(crearInput(e.c2, "c2", e));
        tr.children[4].appendChild(crearInput(e.c3, "c3", e));
        const btn = document.createElement("button");
        btn.textContent = "Eliminar";
        btn.onclick = () => eliminar(i);
        tr.children[8].appendChild(btn);
        tbody.appendChild(tr);
    });
    guardarDatos();
};
const eliminar = i => { estudiantes.splice(i, 1); renderTabla(); };
$("exportar-btn").onclick = () => {
    const csv = ["Nombre,Codigo,C1,C2,C3", ...estudiantes.map(e => `${e.nombre},${e.codigo},${e.c1 ?? ""},${e.c2 ?? ""},${e.c3 ?? ""}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv]));
    a.download = "estudiantes.csv";
    a.click();
    mostrarMensaje("CSV exportado correctamente", "success");
};
$("importar-btn").onclick = () => $("importar-csv").click();
$("importar-csv").onchange = function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        e.target.result.split(/\r?\n/).slice(1).forEach(f => {
            if (!f.trim()) return;
            const [n, c, c1, c2, c3] = f.split(",");
            if (!n) return;
            const nuevo = { nombre: n.trim(), codigo: c.trim(), c1: parseNota(c1), c2: parseNota(c2), c3: parseNota(c3) };
            const index = estudiantes.findIndex(x => x.codigo === nuevo.codigo);
            if (index !== -1) {
                const actual = estudiantes[index];
                estudiantes[index] = {
                    nombre: nuevo.nombre || actual.nombre,
                    codigo: actual.codigo,
                    c1: nuevo.c1 ?? actual.c1,
                    c2: nuevo.c2 ?? actual.c2,
                    c3: nuevo.c3 ?? actual.c3
                };
            } else estudiantes.push(nuevo);
        });
        this.value = "";
        renderTabla();
        mostrarMensaje("CSV importado correctamente", "success");
    };
    reader.readAsText(file);
};
cargarDatos();
[1, 2, 3].forEach(i => $("corte" + i + "-porcentaje").value = porcentajes[i - 1]);
actualizarEncabezados();
renderTabla();