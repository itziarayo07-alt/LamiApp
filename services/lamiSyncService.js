// services/lamiSyncService.js
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";

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
  // ejercicio = { titulo, descripcion, duracion, enfoque, pasos: [...] }
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

  // Marca al paciente como activo este mes para reducir la cuota del psicólogo a $0
  const mesActual = new Date().toISOString().slice(0, 7); // "2026-11"
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