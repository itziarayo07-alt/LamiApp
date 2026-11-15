// services/lamiSyncService.js
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

// 1. VINCULAR PACIENTE CON PSICÓLOGO (ACTUALIZADA CON FOTO Y ESPECIALIDAD)
export async function vincularConPsicologo(patientUid, codigoInput) {
  const codigoLimpio = codigoInput.trim().toUpperCase();
  const q = query(
    collection(db, "psicologos"),
    where("codigoVinculacion", "==", codigoLimpio)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Código de especialista no encontrado. Verifica con tu psicólogo.");
  }

  const psicologoDoc = snap.docs[0];
  const psicologoData = psicologoDoc.data();

  await updateDoc(doc(db, "usuarios", patientUid), {
    psicologoId: psicologoDoc.id,
    psicologoNombre: psicologoData.nombre || "Especialista Lami",
    psicologoFoto: psicologoData.fotoPerfil || null,
    psicologoEspecialidad: psicologoData.especialidad || "",
    vinculadoEn: serverTimestamp(),
  });

  return {
    psicologoId: psicologoDoc.id,
    psicologoNombre: psicologoData.nombre,
    psicologoFoto: psicologoData.fotoPerfil || null,
    psicologoEspecialidad: psicologoData.especialidad || "",
  };
}

// 2. ENVIAR EJERCICIO O TAREA (Desde la App del Psicólogo hacia el Paciente)
export async function enviarEjercicioAPaciente(patientUid, psicologoId, ejercicio) {
  return await addDoc(collection(db, "usuarios", patientUid, "tareas_asignadas"), {
    ...ejercicio,
    psicologoId,
    completado: false,
    creadoEn: serverTimestamp(),
  });
}

// 3. ESCUCHAR EN TIEMPO REAL LO QUE MANDA EL PSICÓLOGO (En CheckingScreen.js del paciente)
export function escucharTareasDelPsicologo(patientUid, callback) {
  const q = query(
    collection(db, "usuarios", patientUid, "tareas_asignadas"),
    orderBy("creadoEn", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs.map((d) => ({
      id: d.id,
      esDePsicologo: true,
      ...d.data(),
    }));
    callback(lista);
  });
}

// 4. MARCAR EJERCICIO COMPLETADO (Alimenta el Flywheel $0 MXN del psicólogo)
export async function completarEjercicioAsignado(patientUid, tareaId) {
  await updateDoc(doc(db, "usuarios", patientUid, "tareas_asignadas", tareaId), {
    completado: true,
    completadoEn: serverTimestamp(),
  });

  const mesActual = new Date().toISOString().slice(0, 7);
  await updateDoc(doc(db, "usuarios", patientUid), {
    activoEnMes: mesActual,
    ultimaActividad: serverTimestamp(),
  });
}

// 5. ESCUCHAR PACIENTES VINCULADOS AL PSICÓLOGO EN TIEMPO REAL
export function escucharMisPacientes(psicologoId, callback) {
  const q = query(
    collection(db, "usuarios"),
    where("psicologoId", "==", psicologoId)
  );

  return onSnapshot(q, (snapshot) => {
    const pacientes = snapshot.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    }));
    callback(pacientes);
  });
}

// 6. GUARDAR NOTA CLÍNICA PRIVADA (Solo visible para el psicólogo)
export async function guardarNotaClinica(patientUid, psicologoId, textoNota) {
  return await addDoc(collection(db, "usuarios", patientUid, "notas_clinicas"), {
    psicologoId,
    contenido: textoNota,
    creadoEn: serverTimestamp(),
  });
}

// 7. ACTUALIZAR PROTOCOLO CLÍNICO DEL PACIENTE (Ansiedad, Duelo, Burnout, Depresión)
export async function actualizarProtocoloPaciente(patientUid, nuevoProtocolo) {
  return await updateDoc(doc(db, "usuarios", patientUid), {
    protocoloClinico: nuevoProtocolo,
  });
}

// 8. GUARDAR TEST DIARIO Y REFLEJARLO AL ESPECIALISTA VINCULADO (SI EL PACIENTE AUTORIZA)
const MAPA_EMOCIONES = {
  "Éxtasis": { animo: 10, estado: "estable" },
  "Muy feliz": { animo: 9, estado: "estable" },
  "Feliz": { animo: 8, estado: "estable" },
  "Emoción": { animo: 8, estado: "estable" },
  "Calma": { animo: 8, estado: "estable" },
  "Neutral": { animo: 6, estado: "atencion" },
  "Triste": { animo: 4, estado: "atencion" },
  "Estrés": { animo: 4, estado: "atencion" },
  "Muy triste": { animo: 2, estado: "urgente" },
  "Ansiedad": { animo: 2, estado: "urgente" },
};

export async function registrarTestDiarioYCompartir({
  emocionPrincipal,
  respuestas = {},
  notaPersonal = "",
  compartirConTerapeuta = false,
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sesión no iniciada.");

  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const psicologoId = userData.psicologoId || null;
  const compartidoEfectivo = Boolean(compartirConTerapeuta && psicologoId);

  const hoyISO = new Date().toISOString().slice(0, 10);
  const mesActual = new Date().toISOString().slice(0, 7);
  const horaFormateada = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const metricas = MAPA_EMOCIONES[emocionPrincipal] || {
    animo: 6,
    estado: "estable",
  };

  await addDoc(collection(db, "usuarios", uid, "checkins"), {
    origen: "test_diario",
    emocion: emocionPrincipal,
    animoScore: metricas.animo,
    estadoClinico: metricas.estado,
    respuestas,
    nota: notaPersonal,
    compartidoConEspecialista: compartidoEfectivo,
    psicologoId: compartidoEfectivo ? psicologoId : null,
    fechaISO: hoyISO,
    creadoEn: serverTimestamp(),
  });

  if (compartidoEfectivo) {
    await updateDoc(userRef, {
      ultimoAnimo: metricas.animo,
      estadoClinico: metricas.estado,
      ultimoCheckinNota:
        notaPersonal.trim() ||
        `Test diario: ${emocionPrincipal} (${metricas.animo}/10)`,
      ultimoCheckinFecha: hoyISO,
      horaUltimoCheckin: horaFormateada,
      activoEnMes: mesActual,
    });
  }
}

// 9. NOTIFICAR AL ESPECIALISTA VINCULADO DESDE ANXIOSÍMETRO ("Necesito Apoyo") O CALENDARIO (Ansiedad / Tristeza)
export async function notificarAlertaAlEspecialista({
  origen, // "anxiosimetro_apoyo" | "calendario"
  emocion = "Ansiedad",
  animoScore = 2,
  notaClinica,
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const psicologoId = userData.psicologoId;

  if (!psicologoId) return;

  const hoyISO = new Date().toISOString().slice(0, 10);
  const mesActual = new Date().toISOString().slice(0, 7);
  const horaFormateada = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await addDoc(collection(db, "usuarios", uid, "checkins"), {
    origen,
    emocion,
    animoScore,
    estadoClinico: "urgente",
    nota: notaClinica,
    compartidoConEspecialista: true,
    psicologoId,
    fechaISO: hoyISO,
    creadoEn: serverTimestamp(),
  });

  await updateDoc(userRef, {
    ultimoAnimo: animoScore,
    estadoClinico: "urgente",
    ultimoCheckinNota: notaClinica,
    ultimoCheckinFecha: hoyISO,
    horaUltimoCheckin: horaFormateada,
    activoEnMes: mesActual,
  });
}