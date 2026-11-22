import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";
import { escucharMisPacientes } from "../../services/lamiSyncService";

const PALETTE = {
  tealDeep: "#6192A4",
  tealMid: "#8BC1D1",
  tealSoft: "#B3D3DA",
  lavenderSoft: "#CEC7FD",
  purpleVibrant: "#A374CC",
  indigoMuted: "#7E83C2",
  bgCanvas: "#F4F2FB",
  cardWhite: "#FFFFFF",
  textDark: "#1E293B",
  textMuted: "#64748B",
};

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const DIAS_SEMANA_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const KEYS_DIA_COMPAT = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
const ENCABEZADOS_CALENDARIO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const HORAS_LISTA = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

const MINUTOS_LISTA = ["00", "10", "15", "20", "30", "40", "45", "50"];

const OBJETIVOS_TERAPEUTICOS = [
  { id: "calma", label: "Regulación emocional y calma", icon: "heart-outline" },
  {
    id: "crisis",
    label: "Abordaje de crisis y respiración",
    icon: "pulse-outline",
  },
  { id: "cognitiva", label: "Reestructuración cognitiva", icon: "bulb-outline" },
  {
    id: "progreso",
    label: "Seguimiento de progreso semanal",
    icon: "trending-up-outline",
  },
  { id: "otro", label: "Otro enfoque personalizado", icon: "create-outline" },
];

const getPacienteKey = (pac, index = 0) =>
  pac?.id || pac?.uid || pac?.correo || `${pac?.nombre || "pac"}-${index}`;

const formatISO = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISO = (isoStr) => {
  const [y, m, d] = String(isoStr).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatearEtiquetaFecha = (isoStr, hoyISO) => {
  const fecha = parseISO(isoStr);
  const diaLargo = DIAS_SEMANA_LARGOS[fecha.getDay()];
  const numDia = String(fecha.getDate()).padStart(2, "0");
  const mesCorto = MESES_CORTOS[fecha.getMonth()];
  const base = `${diaLargo} ${numDia} ${mesCorto}`;
  return isoStr === hoyISO ? `${base} • Hoy` : base;
};

export default function AgendaPsicologo({ navigation }) {
  const hoyReal = useMemo(() => new Date(), []);
  const hoyISO = useMemo(() => formatISO(hoyReal), [hoyReal]);

  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [citasFirestore, setCitasFirestore] = useState([]);

  const [pacienteActivoKey, setPacienteActivoKey] = useState(null);
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState(null);

  // Buscador desplegable de pacientes con lupa
  const [buscadorPacientesAbierto, setBuscadorPacientesAbierto] =
    useState(false);
  const [textoBusquedaPaciente, setTextoBusquedaPaciente] = useState("");

  const [modalidadGlobal, setModalidadGlobal] = useState("consultorio");
  const [direccionConsultorio, setDireccionConsultorio] = useState(
    "Torre Médica #402, Consultorio 4B"
  );
  const [editandoDireccion, setEditandoDireccion] = useState(false);

  // Estado del calendario mensual y selector desplegable de Mes/Año
  const [fechaSeleccionadaISO, setFechaSeleccionadaISO] = useState(hoyISO);
  const [mesVisible, setMesVisible] = useState({
    year: hoyReal.getFullYear(),
    month: hoyReal.getMonth(),
  });
  const [selectorMesAnioAbierto, setSelectorMesAnioAbierto] = useState(false);

  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [turnoHorario, setTurnoHorario] = useState("manana");
  const [horaInicio, setHoraInicio] = useState("08");
  const [minutoInicio, setMinutoInicio] = useState("00");
  const [horaFin, setHoraFin] = useState("08");
  const [minutoFin, setMinutoFin] = useState("50");
  const [nuevaModalidad, setNuevaModalidad] = useState("videollamada");
  const [enfoqueSeleccionado, setEnfoqueSeleccionado] = useState(
    OBJETIVOS_TERAPEUTICOS[0].label
  );
  const [otroEnfoqueTexto, setOtroEnfoqueTexto] = useState("");
  const [guardandoCita, setGuardandoCita] = useState(false);

  const [citaConfirmadaModal, setCitaConfirmadaModal] = useState(null);

  const [notificacionesPsi, setNotificacionesPsi] = useState([]);
  const [notifCentroVisible, setNotifCentroVisible] = useState(false);
  const [alertaCancelacionPacienteModal, setAlertaCancelacionPacienteModal] =
    useState(null);
  const shownNotifIdsRef = useRef(new Set());

  const [citaAEliminarModal, setCitaAEliminarModal] = useState(null);
  const [motivoCancelacionPsi, setMotivoCancelacionPsi] = useState("");
  const [eliminandoCita, setEliminandoCita] = useState(false);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";

  const aniosDisponibles = useMemo(() => {
    const baseYear = hoyReal.getFullYear();
    return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
  }, [hoyReal]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubPerfil = onSnapshot(
      doc(db, "psicologos", auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPerfilPsicologo(data);
          if (data.ubicacion?.direccion) {
            setDireccionConsultorio(data.ubicacion.direccion);
          } else if (data.direccionConsultorio) {
            setDireccionConsultorio(data.direccionConsultorio);
          }
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  useEffect(() => {
    const unsubPac = escucharMisPacientes(psicologoId, (lista) => {
      const reales = lista || [];
      setPacientes(reales);
      if (reales.length > 0) {
        setPacienteActivoKey((prev) => {
          const existe = reales.some((p, i) => getPacienteKey(p, i) === prev);
          return existe ? prev : getPacienteKey(reales[0], 0);
        });
      }
    });
    return () => unsubPac && unsubPac();
  }, [psicologoId]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const q = query(
      collection(db, "citas_psicologo"),
      where("psicologoId", "==", auth.currentUser.uid)
    );
    const unsubCitas = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCitasFirestore(lista);
    });
    return () => unsubCitas();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const qNotif = query(
      collection(db, "notificaciones_psicologo"),
      where("psicologoId", "==", uid)
    );

    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => {
        const ta = a.creadaEn?.seconds || 0;
        const tb = b.creadaEn?.seconds || 0;
        return tb - ta;
      });
      setNotificacionesPsi(lista);

      const nuevaNoLeida = lista.find(
        (n) => !n.leida && !shownNotifIdsRef.current.has(n.id)
      );
      if (nuevaNoLeida) {
        shownNotifIdsRef.current.add(nuevaNoLeida.id);
        setAlertaCancelacionPacienteModal(nuevaNoLeida);
      }
    });

    return () => unsubNotif();
  }, []);

  const marcarNotificacionesPsiLeidas = async () => {
    try {
      const noLeidas = notificacionesPsi.filter((n) => !n.leida);
      for (const item of noLeidas) {
        await updateDoc(doc(db, "notificaciones_psicologo", item.id), {
          leida: true,
        });
      }
    } catch (e) {
      console.warn("No se pudo marcar notificación como leída:", e);
    }
  };

  const unreadNotifCount = notificacionesPsi.filter((n) => !n.leida).length;

  const nombreMostrar =
    perfilPsicologo?.nombre ||
    auth.currentUser?.displayName ||
    "Especialista Lami";
  const cedulaMostrar = perfilPsicologo?.cedulaProfesional || "Pendiente";
  const codigoVinculacion = perfilPsicologo?.codigoVinculacion || "PSI-492";
  const fotoPerfilUri = perfilPsicologo?.fotoPerfil || null;

  const inicialesPsicologo = nombreMostrar
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const pacienteSeleccionado = useMemo(() => {
    if (pacientes.length === 0) return null;
    const idx = pacientes.findIndex(
      (p, i) => getPacienteKey(p, i) === pacienteActivoKey
    );
    return idx >= 0 ? pacientes[idx] : pacientes[0];
  }, [pacientes, pacienteActivoKey]);

  const pacientesFiltradosBuscador = useMemo(() => {
    const q = textoBusquedaPaciente.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.correo || "").toLowerCase().includes(q)
    );
  }, [pacientes, textoBusquedaPaciente]);

  const fotoPacienteActivo =
    pacienteSeleccionado?.fotoPerfil ||
    pacienteSeleccionado?.fotoUrl ||
    pacienteSeleccionado?.foto ||
    null;

  const horarioFormateado = useMemo(() => {
    const sufijo = turnoHorario === "manana" ? "AM" : "PM";
    return `${horaInicio}:${minutoInicio} - ${horaFin}:${minutoFin} ${sufijo}`;
  }, [horaInicio, minutoInicio, horaFin, minutoFin, turnoHorario]);

  const celdasCalendarioMes = useMemo(() => {
    const { year, month } = mesVisible;
    const primerDiaMes = new Date(year, month, 1);
    const totalDiasMes = new Date(year, month + 1, 0).getDate();
    const offsetInicio = (primerDiaMes.getDay() + 6) % 7;

    const celdas = [];
    for (let i = 0; i < offsetInicio; i++) {
      celdas.push({ empty: true, key: `empty-start-${i}` });
    }
    for (let d = 1; d <= totalDiasMes; d++) {
      const dateObj = new Date(year, month, d);
      const iso = formatISO(dateObj);
      celdas.push({
        empty: false,
        key: iso,
        iso,
        num: String(d).padStart(2, "0"),
        diaNombre: DIAS_SEMANA_CORTOS[dateObj.getDay()],
        diaKeyCompat: KEYS_DIA_COMPAT[dateObj.getDay()],
      });
    }
    while (celdas.length % 7 !== 0) {
      celdas.push({ empty: true, key: `empty-end-${celdas.length}` });
    }
    return celdas;
  }, [mesVisible]);

  const fechasConCitasSet = useMemo(() => {
    const set = new Set();
    citasFirestore.forEach((c) => {
      if (c.fechaISO) set.add(c.fechaISO);
    });
    return set;
  }, [citasFirestore]);

  const totalCitasEnMesVisible = useMemo(() => {
    const prefijo = `${mesVisible.year}-${String(mesVisible.month + 1).padStart(
      2,
      "0"
    )}`;
    return citasFirestore.filter((c) =>
      String(c.fechaISO || "").startsWith(prefijo)
    ).length;
  }, [citasFirestore, mesVisible]);

  const agendaDelDia = useMemo(() => {
    const fechaObj = parseISO(fechaSeleccionadaISO);
    const diaKeyCompat = KEYS_DIA_COMPAT[fechaObj.getDay()];

    return citasFirestore.filter((item) => {
      if (item.fechaISO) {
        return item.fechaISO === fechaSeleccionadaISO;
      }
      return item.diaKey === diaKeyCompat;
    });
  }, [citasFirestore, fechaSeleccionadaISO]);

  const etiquetaDiaActual = useMemo(
    () => formatearEtiquetaFecha(fechaSeleccionadaISO, hoyISO),
    [fechaSeleccionadaISO, hoyISO]
  );

  const diaKeyCompatActual = useMemo(() => {
    const fechaObj = parseISO(fechaSeleccionadaISO);
    return KEYS_DIA_COMPAT[fechaObj.getDay()];
  }, [fechaSeleccionadaISO]);

  // NAVEGACIÓN ROBUSTA ENTRE PANTALLAS (detecta automáticamente el nombre exacto de la ruta)
  const irAPantalla = (routeName, params = {}) => {
    const rutasDisponibles = navigation?.getState?.()?.routeNames || [];

    const aliasRutas = {
      ExpedientePaciente: [
        "ExpedientePaciente",
        "Expediente",
        "Expedientes",
        "ExpedientesPsicologo",
        "DetallePaciente",
      ],
      PsicologoDashboard: [
        "PsicologoDashboard",
        "Pacientes",
        "DashboardPsicologo",
        "InicioPsicologo",
      ],
      EjerciciosPsicologo: [
        "EjerciciosPsicologo",
        "Ejercicios",
        "BibliotecaEjercicios",
      ],
      FlywheelQR: ["FlywheelQR", "CodigoQR", "QRPsicologo", "VincularQR"],
      SalaTeleconsulta: [
        "SalaTeleconsulta",
        "Teleconsulta",
        "VideollamadaPsicologo",
      ],
    };

    const candidatos = aliasRutas[routeName] || [routeName];
    const rutaEncontrada = candidatos.find((nombre) =>
      rutasDisponibles.includes(nombre)
    );

    if (rutaEncontrada) {
      navigation.navigate(rutaEncontrada, params);
      return;
    }

    const parentNav = navigation?.getParent?.();
    const rutasPadre = parentNav?.getState?.()?.routeNames || [];
    const rutaEnPadre = candidatos.find((nombre) =>
      rutasPadre.includes(nombre)
    );

    if (rutaEnPadre && parentNav) {
      parentNav.navigate(rutaEnPadre, params);
      return;
    }

    Alert.alert(
      "Ruta no encontrada",
      `No se encontró la pantalla en el navegador.\nRutas activas: ${rutasDisponibles.join(
        ", "
      )}`
    );
  };

  const cambiarMes = (delta) => {
    setMesVisible((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const seleccionarMesDesdeDesplegable = (nuevoMesIdx) => {
    setMesVisible((prev) => {
      const nuevaFecha = new Date(prev.year, nuevoMesIdx, 1);
      setFechaSeleccionadaISO(formatISO(nuevaFecha));
      return { year: prev.year, month: nuevoMesIdx };
    });
    setSelectorMesAnioAbierto(false);
  };

  const seleccionarAnioDesdeDesplegable = (nuevoAnio) => {
    setMesVisible((prev) => {
      const nuevaFecha = new Date(nuevoAnio, prev.month, 1);
      setFechaSeleccionadaISO(formatISO(nuevaFecha));
      return { year: nuevoAnio, month: prev.month };
    });
  };

  const irAHoy = () => {
    const ahora = new Date();
    const isoAhora = formatISO(ahora);
    setMesVisible({ year: ahora.getFullYear(), month: ahora.getMonth() });
    setFechaSeleccionadaISO(isoAhora);
    setCitaSeleccionadaId(null);
    setSelectorMesAnioAbierto(false);
  };

  const esMesActualYHoySeleccionado =
    fechaSeleccionadaISO === hoyISO &&
    mesVisible.year === hoyReal.getFullYear() &&
    mesVisible.month === hoyReal.getMonth();

  const handleCompartirUbicacion = async () => {
    try {
      const mensaje =
        modalidadGlobal === "consultorio"
          ? `📍 Ubicación de nuestra consulta con ${nombreMostrar}:\n${direccionConsultorio}\n\nGoogle Maps: https://maps.google.com/?q=${encodeURIComponent(
              direccionConsultorio
            )}`
          : `🎥 Enlace para nuestra sesión online con ${nombreMostrar}:\nSala de Teleconsulta Lami\n\nTe espero puntual en tu espacio seguro Lami.`;

      await Share.share({ message: mensaje });
    } catch (_) {
      Alert.alert("Error", "No se pudo compartir la información.");
    }
  };

  const handleCompartirPaseCita = async (cita) => {
    try {
      const detalleLugar =
        cita.modalidad === "presencial"
          ? `📍 Presencial: ${direccionConsultorio}`
          : `🎥 Videollamada en Sala de Teleconsulta Lami`;

      await Share.share({
        message: `✨ Cita Confirmada en Lami\nPaciente: ${cita.pacienteNombre}\nDía: ${cita.diaLabel}\nHorario: ${cita.horario}\n${detalleLugar}\nEnfoque: ${cita.motivo}`,
      });
    } catch (_) {}
  };

  const handleUnirseVideollamada = (cita) => {
    irAPantalla("SalaTeleconsulta", {
      paciente: {
        uid: cita.pacienteId || "general",
        nombre: cita.pacienteNombre,
        protocoloClinico: cita.motivo,
      },
    });
  };

  const handleIniciarPresencial = (cita) => {
    const pacienteMatch =
      pacientes.find(
        (p) =>
          (p.id && p.id === cita.pacienteId) ||
          p.nombre?.toLowerCase() === cita.pacienteNombre?.toLowerCase()
      ) || {
        id: cita.pacienteId || null,
        nombre: cita.pacienteNombre,
        motivoConsulta: cita.motivo,
      };
    irAPantalla("ExpedientePaciente", { paciente: pacienteMatch });
  };

  const handleEliminarCita = (cita) => {
    setCitaAEliminarModal(cita);
    setMotivoCancelacionPsi("");
  };

  const handleConfirmarEliminarCitaPsi = async () => {
    const cita = citaAEliminarModal;
    if (!cita) return;

    setEliminandoCita(true);
    try {
      const motivoFinal =
        motivoCancelacionPsi.trim() ||
        "El especialista reprogramará esta sesión próximamente.";

      if (
        auth.currentUser?.uid &&
        cita.id &&
        !String(cita.id).startsWith("local-")
      ) {
        await deleteDoc(doc(db, "citas_psicologo", cita.id));

        const qSol = query(
          collection(db, "solicitudes_sesion"),
          where("citaPsicologoId", "==", cita.id)
        );
        const snapSol = await getDocs(qSol);
        for (const docSol of snapSol.docs) {
          await deleteDoc(doc(db, "solicitudes_sesion", docSol.id));
        }

        if (snapSol.empty && cita.pacienteId) {
          const qSolFallback = query(
            collection(db, "solicitudes_sesion"),
            where("psicologoId", "==", auth.currentUser.uid),
            where("pacienteId", "==", cita.pacienteId)
          );
          const snapFallback = await getDocs(qSolFallback);
          for (const docFb of snapFallback.docs) {
            if (docFb.data().horaCita === cita.horario) {
              await deleteDoc(doc(db, "solicitudes_sesion", docFb.id));
            }
          }
        }

        if (cita.pacienteId) {
          await addDoc(collection(db, "notificaciones_paciente"), {
            pacienteId: cita.pacienteId,
            psicologoId: auth.currentUser.uid,
            psicologoNombre: nombreMostrar,
            fechaCita: cita.diaLabel || "",
            horaCita: cita.horario || "",
            modalidad:
              cita.modalidad === "videollamada" ? "Online" : "Presencial",
            motivo: motivoFinal,
            tipo: "cancelacion_psicologo",
            leida: false,
            creadaEn: serverTimestamp(),
          });
        }
      } else {
        setCitasFirestore((prev) =>
          prev.filter((item) => item.id !== cita.id)
        );
      }

      if (citaSeleccionadaId === cita.id) {
        setCitaSeleccionadaId(null);
      }

      setCitaAEliminarModal(null);
      setMotivoCancelacionPsi("");
    } catch (_) {
      Alert.alert("Error", "No se pudo eliminar la cita.");
    } finally {
      setEliminandoCita(false);
    }
  };

  const handleGuardarNuevaCita = async () => {
    if (!pacienteSeleccionado) {
      Alert.alert(
        "Sin pacientes vinculados",
        "Primero vincula al menos un paciente mediante tu código QR."
      );
      return;
    }

    const hayChoque = agendaDelDia.some(
      (c) =>
        String(c.horario || "").trim().toUpperCase() ===
        horarioFormateado.toUpperCase()
    );

    if (hayChoque) {
      Alert.alert(
        "Horario ocupado ⚠️",
        `Ya tienes una cita agendada el ${etiquetaDiaActual} a las ${horarioFormateado}. Selecciona otro horario o día.`
      );
      return;
    }

    const motivoFinal =
      enfoqueSeleccionado === "Otro enfoque personalizado"
        ? otroEnfoqueTexto.trim() || "Sesión terapéutica personalizada"
        : enfoqueSeleccionado;

    try {
      setGuardandoCita(true);
      const citasPreviasPaciente = citasFirestore.filter(
        (c) =>
          c.pacienteNombre?.toLowerCase() ===
          pacienteSeleccionado.nombre?.toLowerCase()
      ).length;

      const pacienteTargetId =
        pacienteSeleccionado.id || pacienteSeleccionado.uid || null;

      const labelLimpio = etiquetaDiaActual.replace(" • Hoy", "");

      const nueva = {
        psicologoId: auth.currentUser?.uid || "PSI-DEMO-492",
        pacienteId: pacienteTargetId,
        fechaISO: fechaSeleccionadaISO,
        diaKey: diaKeyCompatActual,
        diaLabel: labelLimpio,
        tipo: "cita",
        modalidad: nuevaModalidad,
        turno: turnoHorario,
        horario: horarioFormateado,
        horaInicio: `${horaInicio}:${minutoInicio}`,
        horaFin: `${horaFin}:${minutoFin}`,
        pacienteNombre: pacienteSeleccionado.nombre || "Paciente Lami",
        foto:
          pacienteSeleccionado.fotoPerfil ||
          pacienteSeleccionado.fotoUrl ||
          pacienteSeleccionado.foto ||
          null,
        sesionNum: citasPreviasPaciente + 1,
        motivo: motivoFinal,
        estadoRecordatorio:
          nuevaModalidad === "presencial"
            ? "Recordatorio + Maps listo"
            : "Recordatorio 1h activado",
        ubicacion:
          perfilPsicologo?.ubicacion?.pisoConsultorio || direccionConsultorio,
        createdAt: serverTimestamp(),
      };

      if (auth.currentUser?.uid) {
        const citaPsicologoRef = await addDoc(
          collection(db, "citas_psicologo"),
          nueva
        );

        if (pacienteTargetId) {
          const esPresencial = nuevaModalidad === "presencial";
          await addDoc(collection(db, "solicitudes_sesion"), {
            citaPsicologoId: citaPsicologoRef.id,
            pacienteId: pacienteTargetId,
            pacienteNombre: pacienteSeleccionado.nombre || "Paciente Lami",
            psicologoId: auth.currentUser.uid,
            psicologoNombre: nombreMostrar,
            modalidadSolicitada: esPresencial ? "presencial" : "online",
            modalidadConfirmada: esPresencial ? "presencial" : "online",
            fechaCita: fechaSeleccionadaISO,
            horaCita: horarioFormateado,
            ubicacionConfirmada: esPresencial
              ? perfilPsicologo?.ubicacion || {
                  nombreLugar: "Consultorio",
                  direccion: direccionConsultorio,
                  ciudad: "",
                }
              : null,
            respuestaTerapeuta: `Sesión programada (${labelLimpio} • ${horarioFormateado}): ${motivoFinal}`,
            estado: "confirmada",
            creadoEn: serverTimestamp(),
          });
        }
      } else {
        setCitasFirestore((prev) => [
          ...prev,
          { id: `local-${Date.now()}`, ...nueva },
        ]);
      }

      setModalNuevaCita(false);
      setOtroEnfoqueTexto("");
      setCitaConfirmadaModal(nueva);
    } catch (error) {
      Alert.alert("Error", "No se pudo agendar la cita.");
    } finally {
      setGuardandoCita(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LinearGradient
        colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroBubbleOne} />
        <View style={styles.heroBubbleTwo} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroDoctorInfo}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => irAPantalla("PsicologoDashboard")}
              style={styles.heroAvatarFrame}
            >
              {fotoPerfilUri ? (
                <Image
                  source={{ uri: fotoPerfilUri }}
                  style={styles.heroAvatarImg}
                />
              ) : (
                <Text style={styles.heroAvatarText}>
                  {inicialesPsicologo || "PSI"}
                </Text>
              )}
              <View style={styles.heroOnlineDot} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {nombreMostrar}
                </Text>
                <View style={styles.heroCodeBadge}>
                  <Text style={styles.heroCodeText}>{codigoVinculacion}</Text>
                </View>
              </View>
              <Text style={styles.heroSub}>
                Céd. {cedulaMostrar} • Agenda Terapéutica
              </Text>
            </View>
          </View>

          <View style={styles.heroActionsRight}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroBellBtn}
              onPress={() => {
                setNotifCentroVisible(true);
                marcarNotificacionesPsiLeidas();
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color="#FFFFFF"
              />
              {unreadNotifCount > 0 && (
                <View style={styles.heroNotifBadge}>
                  <Text style={styles.heroNotifBadgeText}>
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalNuevaCita(true)}
              activeOpacity={0.88}
              style={styles.heroNewBtn}
            >
              <Ionicons
                name="add-circle"
                size={18}
                color={PALETTE.purpleVibrant}
              />
              <Text style={styles.heroNewBtnText}>Agendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TARJETA DE PACIENTE ACTIVO + LUPA DESPLEGABLE */}
        <View style={styles.selectedPatientBanner}>
          {pacienteSeleccionado ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  setBuscadorPacientesAbierto(!buscadorPacientesAbierto)
                }
                style={styles.selectedBannerLeft}
              >
                {fotoPacienteActivo ? (
                  <Image
                    source={{ uri: fotoPacienteActivo }}
                    style={styles.selectedPatientAvatarImg}
                  />
                ) : (
                  <LinearGradient
                    colors={[PALETTE.tealMid, PALETTE.tealDeep]}
                    style={styles.selectedPatientAvatar}
                  >
                    <Text style={styles.selectedPatientInitial}>
                      {(pacienteSeleccionado.nombre || "P")[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTag}>
                    PACIENTE ACTIVO ({pacientes.length})
                  </Text>
                  <View style={styles.selectedNameChevronRow}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {pacienteSeleccionado.nombre}
                    </Text>
                    <Ionicons
                      name={
                        buscadorPacientesAbierto
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.bannerRightActions}>
                <TouchableOpacity
                  onPress={() =>
                    setBuscadorPacientesAbierto(!buscadorPacientesAbierto)
                  }
                  activeOpacity={0.85}
                  style={[
                    styles.searchPatientIconBtn,
                    buscadorPacientesAbierto &&
                      styles.searchPatientIconBtnActive,
                  ]}
                >
                  <Ionicons
                    name={buscadorPacientesAbierto ? "close" : "search"}
                    size={17}
                    color={
                      buscadorPacientesAbierto
                        ? PALETTE.purpleVibrant
                        : "#FFFFFF"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setModalNuevaCita(true)}
                  style={styles.quickSchedulePill}
                >
                  <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.quickScheduleText}>Citar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.selectedBannerLeft}>
              <Ionicons
                name="qr-code-outline"
                size={20}
                color={PALETTE.lavenderSoft}
              />
              <Text style={styles.selectedEmptyText}>
                Vincula pacientes con tu QR para seleccionarlos aquí
              </Text>
            </View>
          )}
        </View>

        {/* PANEL DESPLEGABLE DE BÚSQUEDA Y LISTA COMPLETA DE PACIENTES */}
        {buscadorPacientesAbierto && pacientes.length > 0 && (
          <View style={styles.patientDropdownCard}>
            <View style={styles.patientDropdownSearchRow}>
              <Ionicons
                name="search"
                size={16}
                color={PALETTE.purpleVibrant}
              />
              <TextInput
                style={styles.patientDropdownInput}
                placeholder="Buscar paciente por nombre..."
                placeholderTextColor="#94A3B8"
                value={textoBusquedaPaciente}
                onChangeText={setTextoBusquedaPaciente}
                autoFocus
              />
              {textoBusquedaPaciente !== "" && (
                <TouchableOpacity onPress={() => setTextoBusquedaPaciente("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.patientDropdownList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {pacientesFiltradosBuscador.length === 0 ? (
                <Text style={styles.patientDropdownEmpty}>
                  No se encontraron pacientes con ese nombre.
                </Text>
              ) : (
                pacientesFiltradosBuscador.map((pac, idx) => {
                  const keyUnica = getPacienteKey(pac, idx);
                  const isSelected = keyUnica === pacienteActivoKey;
                  const fotoItem =
                    pac.fotoPerfil || pac.fotoUrl || pac.foto || null;
                  return (
                    <TouchableOpacity
                      key={keyUnica}
                      activeOpacity={0.82}
                      onPress={() => {
                        setPacienteActivoKey(keyUnica);
                        setBuscadorPacientesAbierto(false);
                        setTextoBusquedaPaciente("");
                      }}
                      style={[
                        styles.patientDropdownItem,
                        isSelected && styles.patientDropdownItemActive,
                      ]}
                    >
                      {fotoItem ? (
                        <Image
                          source={{ uri: fotoItem }}
                          style={styles.dropdownItemAvatar}
                        />
                      ) : (
                        <View style={styles.dropdownItemAvatarFallback}>
                          <Text style={styles.dropdownItemInitial}>
                            {(pac.nombre || "P")[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemName,
                            isSelected && { color: PALETTE.purpleVibrant },
                          ]}
                          numberOfLines={1}
                        >
                          {pac.nombre}
                        </Text>
                        {pac.correo ? (
                          <Text
                            style={styles.dropdownItemSub}
                            numberOfLines={1}
                          >
                            {pac.correo}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={PALETTE.purpleVibrant}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CALENDARIO MENSUAL REDONDEADO CON DESPLEGABLE DE MES Y AÑO */}
        <View style={styles.monthCalendarCard}>
          <LinearGradient
            colors={["#F6F3FF", "#EAF5F8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.monthHeaderBanner}
          >
            <TouchableOpacity
              onPress={() => cambiarMes(-1)}
              activeOpacity={0.8}
              style={styles.monthNavBtn}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={PALETTE.indigoMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                setSelectorMesAnioAbierto(!selectorMesAnioAbierto)
              }
              style={styles.monthDropdownTrigger}
            >
              <Ionicons
                name="calendar"
                size={15}
                color={PALETTE.purpleVibrant}
              />
              <Text style={styles.monthTitleText}>
                {NOMBRES_MESES[mesVisible.month]} {mesVisible.year}
              </Text>
              <Ionicons
                name={selectorMesAnioAbierto ? "chevron-up" : "chevron-down"}
                size={15}
                color={PALETTE.purpleVibrant}
              />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {!esMesActualYHoySeleccionado && (
                <TouchableOpacity
                  onPress={irAHoy}
                  activeOpacity={0.8}
                  style={styles.todayPillBtn}
                >
                  <Text style={styles.todayPillText}>Hoy</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => cambiarMes(1)}
                activeOpacity={0.8}
                style={styles.monthNavBtn}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={PALETTE.indigoMuted}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* DESPLEGABLE DE SELECCIÓN RÁPIDA DE AÑO Y MES */}
          {selectorMesAnioAbierto && (
            <View style={styles.monthPickerDropdownPanel}>
              <Text style={styles.pickerSectionTag}>SELECCIONA EL AÑO</Text>
              <View style={styles.yearsRow}>
                {aniosDisponibles.map((yr) => {
                  const activoAnio = mesVisible.year === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      onPress={() => seleccionarAnioDesdeDesplegable(yr)}
                      style={[
                        styles.yearChip,
                        activoAnio && styles.yearChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearChipText,
                          activoAnio && styles.yearChipTextActive,
                        ]}
                      >
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.pickerSectionTag, { marginTop: 8 }]}>
                SELECCIONA EL MES
              </Text>
              <View style={styles.monthsGrid}>
                {NOMBRES_MESES.map((nombreMes, idxMes) => {
                  const activoMes = mesVisible.month === idxMes;
                  return (
                    <TouchableOpacity
                      key={nombreMes}
                      onPress={() => seleccionarMesDesdeDesplegable(idxMes)}
                      style={[
                        styles.monthOptionCell,
                        activoMes && styles.monthOptionCellActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthOptionText,
                          activoMes && styles.monthOptionTextActive,
                        ]}
                      >
                        {nombreMes.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* BARRA DE DÍAS DE LA SEMANA */}
          <View style={styles.weekDaysHeaderBar}>
            {ENCABEZADOS_CALENDARIO.map((nombreDia, i) => (
              <View key={nombreDia} style={styles.weekDayHeaderCell}>
                <Text
                  style={[
                    styles.weekDayHeaderText,
                    i >= 5 && { color: PALETTE.indigoMuted },
                  ]}
                >
                  {nombreDia}
                </Text>
              </View>
            ))}
          </View>

          {/* CUADRÍCULA DE DÍAS DEL MES */}
          <View style={styles.monthGridWrap}>
            {celdasCalendarioMes.map((celda) => {
              if (celda.empty) {
                return <View key={celda.key} style={styles.monthDayCell} />;
              }

              const seleccionado = celda.iso === fechaSeleccionadaISO;
              const esHoy = celda.iso === hoyISO;
              const tieneCitas = fechasConCitasSet.has(celda.iso);

              return (
                <TouchableOpacity
                  key={celda.key}
                  onPress={() => {
                    setFechaSeleccionadaISO(celda.iso);
                    setCitaSeleccionadaId(null);
                  }}
                  activeOpacity={0.85}
                  style={styles.monthDayCell}
                >
                  {seleccionado ? (
                    <LinearGradient
                      colors={[PALETTE.tealDeep, PALETTE.tealMid]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.monthDayPillActive}
                    >
                      <Text style={styles.monthDayNumActive}>{celda.num}</Text>
                      <View style={styles.monthDotActive} />
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.monthDayPillInactive,
                        esHoy && styles.monthDayPillToday,
                        tieneCitas && !esHoy && styles.monthDayPillWithCita,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthDayNumInactive,
                          esHoy && styles.monthDayNumToday,
                        ]}
                      >
                        {celda.num}
                      </Text>
                      {tieneCitas ? (
                        <View style={styles.monthDotCita} />
                      ) : esHoy ? (
                        <View style={styles.monthDotHoy} />
                      ) : (
                        <View style={styles.monthDotPlaceholder} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LEYENDA INFERIOR DEL CALENDARIO */}
          <View style={styles.calendarFooterLegend}>
            <View style={styles.legendGroup}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: PALETTE.tealDeep },
                  ]}
                />
                <Text style={styles.legendText}>Hoy</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: PALETTE.purpleVibrant },
                  ]}
                />
                <Text style={styles.legendText}>Con cita</Text>
              </View>
            </View>

            <Text style={styles.monthSummaryText}>
              {totalCitasEnMesVisible}{" "}
              {totalCitasEnMesVisible === 1 ? "cita en el mes" : "citas en el mes"}
            </Text>
          </View>
        </View>

        <View style={styles.modalityCompactCard}>
          <View style={styles.modalityToggleRow}>
            <TouchableOpacity
              style={[
                styles.modPill,
                modalidadGlobal === "consultorio" && styles.modPillTealActive,
              ]}
              onPress={() => setModalidadGlobal("consultorio")}
            >
              <Ionicons
                name="business"
                size={14}
                color={
                  modalidadGlobal === "consultorio"
                    ? "#FFFFFF"
                    : PALETTE.tealDeep
                }
              />
              <Text
                style={[
                  styles.modPillText,
                  modalidadGlobal === "consultorio" && { color: "#FFFFFF" },
                ]}
              >
                Consultorio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modPill,
                modalidadGlobal === "online" && styles.modPillPurpleActive,
              ]}
              onPress={() => setModalidadGlobal("online")}
            >
              <Ionicons
                name="videocam"
                size={14}
                color={
                  modalidadGlobal === "online"
                    ? "#FFFFFF"
                    : PALETTE.purpleVibrant
                }
              />
              <Text
                style={[
                  styles.modPillText,
                  modalidadGlobal === "online" && { color: "#FFFFFF" },
                ]}
              >
                100% Online
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCompartirUbicacion}
              style={styles.shareChipBtn}
            >
              <Ionicons
                name="share-social-outline"
                size={14}
                color={PALETTE.indigoMuted}
              />
              <Text style={styles.shareChipText}>Enviar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationMiniRow}>
            <Ionicons
              name={
                modalidadGlobal === "consultorio"
                  ? "location-outline"
                  : "link-outline"
              }
              size={14}
              color={PALETTE.textMuted}
            />
            {editandoDireccion && modalidadGlobal === "consultorio" ? (
              <TextInput
                style={styles.locationInput}
                value={direccionConsultorio}
                onChangeText={setDireccionConsultorio}
                onBlur={() => setEditandoDireccion(false)}
                autoFocus
              />
            ) : (
              <TouchableOpacity
                onPress={() =>
                  modalidadGlobal === "consultorio" &&
                  setEditandoDireccion(true)
                }
                style={{ flex: 1 }}
              >
                <Text style={styles.locationMiniText} numberOfLines={1}>
                  {modalidadGlobal === "consultorio"
                    ? direccionConsultorio
                    : "Sala Virtual Lami • Lista para teleconsulta"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.dayHeaderRow}>
          <Text style={styles.dayHeadingText}>{etiquetaDiaActual}</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              {agendaDelDia.length}{" "}
              {agendaDelDia.length === 1 ? "sesión" : "sesiones"}
            </Text>
          </View>
        </View>

        {agendaDelDia.length === 0 ? (
          <View style={styles.emptyAgendaCard}>
            <LinearGradient
              colors={["#EDE9FE", "#E0F2FE"]}
              style={styles.emptyIconCircle}
            >
              <Ionicons
                name="sparkles-outline"
                size={26}
                color={PALETTE.purpleVibrant}
              />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Agenda despejada</Text>
            <Text style={styles.emptySubtitle}>
              {pacienteSeleccionado
                ? `¿Quieres agendar una sesión con ${pacienteSeleccionado.nombre} para el ${etiquetaDiaActual}?`
                : "Selecciona un paciente arriba con la lupa y toca Agendar."}
            </Text>
            <TouchableOpacity
              onPress={() => setModalNuevaCita(true)}
              activeOpacity={0.88}
              style={{ marginTop: 6 }}
            >
              <LinearGradient
                colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyActionBtn}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Programar Cita</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          agendaDelDia.map((item) => {
            const esVideo = item.modalidad === "videollamada";
            const accentColor = esVideo
              ? PALETTE.purpleVibrant
              : PALETTE.tealDeep;
            const estaSeleccionada = citaSeleccionadaId === item.id;
            const pacVinculado = pacientes.find(
              (p) =>
                (p.id && p.id === item.pacienteId) ||
                (p.uid && p.uid === item.pacienteId) ||
                p.nombre?.trim().toLowerCase() ===
                  item.pacienteNombre?.trim().toLowerCase()
            );
            const fotoCitaMostrar =
              item.foto ||
              pacVinculado?.fotoPerfil ||
              pacVinculado?.fotoUrl ||
              pacVinculado?.foto ||
              null;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.92}
                onPress={() =>
                  setCitaSeleccionadaId((prev) =>
                    prev === item.id ? null : item.id
                  )
                }
                style={[
                  styles.appointmentCard,
                  estaSeleccionada && styles.appointmentCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.appointmentAccentBar,
                    { backgroundColor: accentColor },
                  ]}
                />

                <View style={styles.appointmentBody}>
                  <View style={styles.appointmentTopRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={styles.timeAndTagRow}>
                        <Text
                          style={[
                            styles.appointmentTime,
                            { color: accentColor },
                          ]}
                        >
                          {item.horario}
                        </Text>

                        <View
                          style={[
                            styles.modalityBadge,
                            {
                              backgroundColor: esVideo ? "#F3E8FF" : "#E0F2F1",
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              item.turno === "manana"
                                ? "sunny-outline"
                                : "moon-outline"
                            }
                            size={11}
                            color={accentColor}
                          />
                          <Text
                            style={[
                              styles.modalityBadgeText,
                              { color: accentColor },
                            ]}
                          >
                            {esVideo
                              ? "Videollamada"
                              : item.ubicacion || "Consultorio"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.patientSessionTitle}>
                        {item.pacienteNombre} • Sesión #{item.sesionNum || 1}
                      </Text>
                      <Text style={styles.appointmentMotivo} numberOfLines={2}>
                        {item.motivo}
                      </Text>
                    </View>

                    {fotoCitaMostrar ? (
                      <Image
                        source={{ uri: fotoCitaMostrar }}
                        style={styles.patientAvatar}
                      />
                    ) : (
                      <LinearGradient
                        colors={[PALETTE.lavenderSoft, PALETTE.tealSoft]}
                        style={styles.patientAvatarFallback}
                      >
                        <Text style={styles.patientAvatarInitials}>
                          {item.pacienteNombre
                            ?.split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>

                  <View style={styles.appointmentFooterRow}>
                    <View style={styles.reminderConfirmRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color="#10B981"
                      />
                      <Text style={styles.reminderConfirmText}>
                        {item.estadoRecordatorio}
                      </Text>
                    </View>

                    {esVideo ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleUnirseVideollamada(item)}
                      >
                        <LinearGradient
                          colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.actionBtn}
                        >
                          <Ionicons
                            name="videocam"
                            size={14}
                            color="#FFFFFF"
                          />
                          <Text style={styles.actionBtnText}>
                            Unirse a sala
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleIniciarPresencial(item)}
                      >
                        <LinearGradient
                          colors={[PALETTE.tealDeep, "#4E7C8D"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.actionBtn}
                        >
                          <Ionicons
                            name="clipboard-outline"
                            size={14}
                            color="#FFFFFF"
                          />
                          <Text style={styles.actionBtnText}>
                            Abrir Expediente
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  {estaSeleccionada && (
                    <View style={styles.deleteBarRow}>
                      <Text style={styles.deleteHintText}>
                        Cita seleccionada
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleEliminarCita(item)}
                        activeOpacity={0.85}
                        style={styles.deleteCitaBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="#DC2626"
                        />
                        <Text style={styles.deleteCitaBtnText}>
                          Eliminar cita
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODALES EXISTENTES */}
      <Modal
        visible={!!alertaCancelacionPacienteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAlertaCancelacionPacienteModal(null);
          marcarNotificacionesPsiLeidas();
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <LinearGradient
              colors={["#FFF1F2", "#F3E8FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmTopBanner}
            >
              <LinearGradient
                colors={["#E11D48", PALETTE.purpleVibrant]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmIconBubble}
              >
                <Ionicons name="calendar-clear" size={30} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.cancelBadgePill}>
                <Ionicons name="notifications" size={12} color="#E11D48" />
                <Text style={styles.cancelBadgePillText}>
                  AVISO DE CANCELACIÓN
                </Text>
              </View>

              <Text style={styles.confirmTitle}>
                Cita cancelada por el paciente
              </Text>
              <Text style={styles.confirmSubtitle}>
                <Text style={{ fontWeight: "800", color: PALETTE.textDark }}>
                  {alertaCancelacionPacienteModal?.pacienteNombre ||
                    "Un paciente"}
                </Text>{" "}
                ha cancelado su sesión (
                {alertaCancelacionPacienteModal?.modalidad || "Sesión"}) y se
                liberó el espacio en tu agenda.
              </Text>
            </LinearGradient>

            {alertaCancelacionPacienteModal && (
              <View style={styles.confirmTicketBox}>
                <View style={styles.confirmTicketRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={PALETTE.purpleVibrant}
                  />
                  <Text style={styles.confirmTicketText}>
                    {alertaCancelacionPacienteModal.fechaCita || ""}{" "}
                    {alertaCancelacionPacienteModal.horaCita
                      ? `• ${alertaCancelacionPacienteModal.horaCita}`
                      : ""}
                  </Text>
                </View>

                <View style={styles.confirmTicketRow}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color="#E11D48"
                  />
                  <Text style={styles.confirmTicketText}>
                    Motivo: "
                    {alertaCancelacionPacienteModal.motivo ||
                      "Sin motivo especificado"}
                    "
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setAlertaCancelacionPacienteModal(null);
                marcarNotificacionesPsiLeidas();
              }}
              style={{ width: "100%" }}
            >
              <LinearGradient
                colors={[PALETTE.purpleVibrant, PALETTE.tealDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmDoneBtn}
              >
                <Text style={styles.confirmDoneText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!citaAEliminarModal}
        transparent
        animationType="fade"
        onRequestClose={() => !eliminandoCita && setCitaAEliminarModal(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.deleteModalIconRing}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.cancelBadgePillText}>CANCELAR CONSULTA</Text>
            <Text style={styles.confirmTitle}>¿Eliminar cita agendada?</Text>
            <Text style={styles.confirmSubtitle}>
              Se eliminará de tu agenda y del calendario de{" "}
              <Text style={{ fontWeight: "800", color: PALETTE.textDark }}>
                {citaAEliminarModal?.pacienteNombre}
              </Text>
              . Puedes escribirle un breve motivo:
            </Text>

            <TextInput
              style={styles.psiCancelReasonInput}
              multiline
              placeholder="Ej. Reprogramaremos tu sesión por ajuste de horario..."
              placeholderTextColor="#94A3B8"
              value={motivoCancelacionPsi}
              onChangeText={setMotivoCancelacionPsi}
              editable={!eliminandoCita}
            />

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                onPress={() => setCitaAEliminarModal(null)}
                disabled={eliminandoCita}
                style={styles.confirmShareBtn}
              >
                <Text style={styles.confirmShareText}>Conservar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmarEliminarCitaPsi}
                disabled={eliminandoCita}
                style={[
                  styles.deleteConfirmActionBtn,
                  eliminandoCita && { opacity: 0.7 },
                ]}
              >
                {eliminandoCita ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDoneText}>
                    Eliminar y notificar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notifCentroVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifCentroVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={PALETTE.purpleVibrant}
                />
                <Text style={styles.modalTitle}>
                  Notificaciones ({notificacionesPsi.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNotifCentroVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={PALETTE.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                gap: 10,
                paddingTop: 10,
                paddingBottom: 16,
              }}
            >
              {notificacionesPsi.length === 0 ? (
                <View style={styles.emptyNotifContainer}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={32}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyTitle}>Sin avisos recientes</Text>
                  <Text style={styles.emptySubtitle}>
                    Cuando un paciente cancele una cita aparecerá aquí con su
                    motivo.
                  </Text>
                </View>
              ) : (
                notificacionesPsi.map((notif) => (
                  <View key={notif.id} style={styles.notifPsiCard}>
                    <View style={styles.notifPsiTopRow}>
                      <View style={styles.notifPsiTag}>
                        <Text style={styles.notifPsiTagText}>
                          Cita Cancelada
                        </Text>
                      </View>
                      <Text style={styles.notifPsiDate}>
                        {notif.fechaCita || ""}
                      </Text>
                    </View>
                    <Text style={styles.notifPsiTitle}>
                      {notif.pacienteNombre || "Paciente"} canceló su cita (
                      {notif.modalidad || "Sesión"})
                    </Text>
                    {notif.horaCita ? (
                      <Text style={styles.notifPsiMeta}>
                        ⏰ {notif.horaCita}
                      </Text>
                    ) : null}
                    <Text style={styles.notifPsiMotivo}>
                      💬 Motivo: "{notif.motivo || "Sin motivo"}"
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalNuevaCita}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNuevaCita(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Programar Sesión</Text>
                <Text style={styles.modalSub}>{etiquetaDiaActual}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalNuevaCita(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={PALETTE.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              <Text style={styles.inputLabel}>Paciente seleccionado</Text>
              {pacienteSeleccionado && (
                <LinearGradient
                  colors={["#F3E8FF", "#E0F2FE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.selectedPatientPreviewCard}
                >
                  {fotoPacienteActivo ? (
                    <Image
                      source={{ uri: fotoPacienteActivo }}
                      style={styles.previewBadgeAvatarImg}
                    />
                  ) : (
                    <View style={styles.previewBadgeCircle}>
                      <Text style={styles.previewBadgeLetter}>
                        {(pacienteSeleccionado.nombre || "P")[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewPatientName}>
                      {pacienteSeleccionado.nombre}
                    </Text>
                    <Text style={styles.previewPatientMeta}>
                      Paciente vinculado por QR • Listo para agendar
                    </Text>
                  </View>
                  <Ionicons
                    name="checkmark-done-circle"
                    size={22}
                    color={PALETTE.purpleVibrant}
                  />
                </LinearGradient>
              )}

              {pacientes.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.patientChipsScroll}
                >
                  {pacientes.map((pac, idx) => {
                    const keyUnica = getPacienteKey(pac, idx);
                    const activo = keyUnica === pacienteActivoKey;
                    return (
                      <TouchableOpacity
                        key={keyUnica}
                        onPress={() => setPacienteActivoKey(keyUnica)}
                        style={[
                          styles.patientSelectChip,
                          activo && styles.patientSelectChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.patientSelectChipText,
                            activo && { color: "#FFFFFF" },
                          ]}
                        >
                          {pac.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.hourHeaderRow}>
                <Text style={styles.inputLabel}>Horario de la sesión</Text>
                <View style={styles.hourPreviewPill}>
                  <Ionicons
                    name={turnoHorario === "manana" ? "sunny" : "moon"}
                    size={13}
                    color={PALETTE.purpleVibrant}
                  />
                  <Text style={styles.hourPreviewText}>
                    {horarioFormateado}
                  </Text>
                </View>
              </View>

              <View style={styles.turnoRow}>
                <TouchableOpacity
                  onPress={() => setTurnoHorario("manana")}
                  style={[
                    styles.turnoBtn,
                    turnoHorario === "manana" && styles.turnoBtnMananaActive,
                  ]}
                >
                  <Ionicons
                    name="sunny"
                    size={16}
                    color={turnoHorario === "manana" ? "#FFFFFF" : "#D97706"}
                  />
                  <Text
                    style={[
                      styles.turnoBtnText,
                      turnoHorario === "manana" && { color: "#FFFFFF" },
                    ]}
                  >
                    Mañana (AM)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTurnoHorario("tarde")}
                  style={[
                    styles.turnoBtn,
                    turnoHorario === "tarde" && styles.turnoBtnTardeActive,
                  ]}
                >
                  <Ionicons
                    name="moon"
                    size={15}
                    color={
                      turnoHorario === "tarde"
                        ? "#FFFFFF"
                        : PALETTE.indigoMuted
                    }
                  />
                  <Text
                    style={[
                      styles.turnoBtnText,
                      turnoHorario === "tarde" && { color: "#FFFFFF" },
                    ]}
                  >
                    Tarde (PM)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subSectionTimeLabel}>Hora de inicio</Text>
              <View style={styles.pickersRow}>
                <View style={styles.pickerBox}>
                  <Text style={styles.pickerMiniLabel}>Hora</Text>
                  <View style={styles.pickerInnerWrapper}>
                    <Picker
                      selectedValue={horaInicio}
                      onValueChange={(val) => setHoraInicio(val)}
                      style={styles.pickerControl}
                      dropdownIconColor={PALETTE.purpleVibrant}
                    >
                      {HORAS_LISTA.map((h) => (
                        <Picker.Item
                          key={`ini-h-${h}`}
                          label={`${h} hrs`}
                          value={h}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.pickerBox}>
                  <Text style={styles.pickerMiniLabel}>Minutos</Text>
                  <View style={styles.pickerInnerWrapper}>
                    <Picker
                      selectedValue={minutoInicio}
                      onValueChange={(val) => setMinutoInicio(val)}
                      style={styles.pickerControl}
                      dropdownIconColor={PALETTE.tealDeep}
                    >
                      {MINUTOS_LISTA.map((m) => (
                        <Picker.Item
                          key={`ini-m-${m}`}
                          label={`:${m} min`}
                          value={m}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={styles.subSectionTimeLabel}>Hora de término</Text>
              <View style={styles.pickersRow}>
                <View style={styles.pickerBox}>
                  <Text style={styles.pickerMiniLabel}>Hora</Text>
                  <View style={styles.pickerInnerWrapper}>
                    <Picker
                      selectedValue={horaFin}
                      onValueChange={(val) => setHoraFin(val)}
                      style={styles.pickerControl}
                      dropdownIconColor={PALETTE.purpleVibrant}
                    >
                      {HORAS_LISTA.map((h) => (
                        <Picker.Item
                          key={`fin-h-${h}`}
                          label={`${h} hrs`}
                          value={h}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.pickerBox}>
                  <Text style={styles.pickerMiniLabel}>Minutos</Text>
                  <View style={styles.pickerInnerWrapper}>
                    <Picker
                      selectedValue={minutoFin}
                      onValueChange={(val) => setMinutoFin(val)}
                      style={styles.pickerControl}
                      dropdownIconColor={PALETTE.tealDeep}
                    >
                      {MINUTOS_LISTA.map((m) => (
                        <Picker.Item
                          key={`fin-m-${m}`}
                          label={`:${m} min`}
                          value={m}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Modalidad de consulta</Text>
              <View style={styles.modalModalityRow}>
                <TouchableOpacity
                  style={[
                    styles.modalModalityBtn,
                    nuevaModalidad === "videollamada" &&
                      styles.modalModalityBtnPurple,
                  ]}
                  onPress={() => setNuevaModalidad("videollamada")}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={
                      nuevaModalidad === "videollamada"
                        ? "#FFFFFF"
                        : PALETTE.purpleVibrant
                    }
                  />
                  <Text
                    style={[
                      styles.modalModalityText,
                      nuevaModalidad === "videollamada" && { color: "#FFFFFF" },
                    ]}
                  >
                    Videollamada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalModalityBtn,
                    nuevaModalidad === "presencial" &&
                      styles.modalModalityBtnTeal,
                  ]}
                  onPress={() => setNuevaModalidad("presencial")}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={
                      nuevaModalidad === "presencial"
                        ? "#FFFFFF"
                        : PALETTE.tealDeep
                    }
                  />
                  <Text
                    style={[
                      styles.modalModalityText,
                      nuevaModalidad === "presencial" && { color: "#FFFFFF" },
                    ]}
                  >
                    Presencial
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Enfoque de la sesión</Text>
              <View style={styles.objetivosVerticalList}>
                {OBJETIVOS_TERAPEUTICOS.map((item) => {
                  const activoObj = enfoqueSeleccionado === item.label;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setEnfoqueSeleccionado(item.label)}
                      activeOpacity={0.85}
                      style={[
                        styles.objetivoRowCard,
                        activoObj && styles.objetivoRowCardActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.objetivoIconBadge,
                          activoObj && { backgroundColor: PALETTE.tealDeep },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={16}
                          color={activoObj ? "#FFFFFF" : PALETTE.tealDeep}
                        />
                      </View>
                      <Text
                        style={[
                          styles.objetivoRowText,
                          activoObj && styles.objetivoRowTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Ionicons
                        name={
                          activoObj ? "radio-button-on" : "radio-button-off"
                        }
                        size={19}
                        color={activoObj ? PALETTE.tealDeep : "#CBD5E1"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {enfoqueSeleccionado === "Otro enfoque personalizado" && (
                <TextInput
                  style={styles.otroEnfoqueInput}
                  placeholder="Escribe el enfoque específico de esta sesión..."
                  placeholderTextColor="#94A3B8"
                  value={otroEnfoqueTexto}
                  onChangeText={setOtroEnfoqueTexto}
                />
              )}

              <TouchableOpacity
                disabled={guardandoCita}
                onPress={handleGuardarNuevaCita}
                activeOpacity={0.88}
                style={{ marginTop: 18 }}
              >
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.tealDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveCitaBtn}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.saveCitaBtnText}>
                    {guardandoCita ? "Registrando..." : "Confirmar Cita"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!citaConfirmadaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCitaConfirmadaModal(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <LinearGradient
              colors={["#EDE9FE", "#E0F2FE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmTopBanner}
            >
              <LinearGradient
                colors={[PALETTE.purpleVibrant, PALETTE.tealDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmIconBubble}
              >
                <Ionicons name="checkmark-done" size={34} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.confirmSuccessBadge}>
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={PALETTE.purpleVibrant}
                />
                <Text style={styles.confirmSuccessBadgeText}>
                  REGISTRO EXITOSO
                </Text>
              </View>

              <Text style={styles.confirmTitle}>
                ¡Cita Registrada Correctamente!
              </Text>
              <Text style={styles.confirmSubtitle}>
                El espacio terapéutico para{" "}
                <Text style={{ fontWeight: "800", color: PALETTE.textDark }}>
                  {citaConfirmadaModal?.pacienteNombre}
                </Text>{" "}
                ya quedó guardado en tu agenda clínica.
              </Text>
            </LinearGradient>

            {citaConfirmadaModal && (
              <View style={styles.confirmTicketBox}>
                <View style={styles.confirmTicketRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={PALETTE.purpleVibrant}
                  />
                  <Text style={styles.confirmTicketText}>
                    {citaConfirmadaModal.diaLabel}
                  </Text>
                </View>

                <View style={styles.confirmTicketRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={PALETTE.tealDeep}
                  />
                  <Text style={styles.confirmTicketText}>
                    {citaConfirmadaModal.horario} •{" "}
                    {citaConfirmadaModal.turno === "manana"
                      ? "Mañana"
                      : "Tarde"}
                  </Text>
                </View>

                <View style={styles.confirmTicketRow}>
                  <Ionicons
                    name="heart-outline"
                    size={16}
                    color={PALETTE.indigoMuted}
                  />
                  <Text style={styles.confirmTicketText} numberOfLines={2}>
                    {citaConfirmadaModal.motivo}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                onPress={() => handleCompartirPaseCita(citaConfirmadaModal)}
                style={styles.confirmShareBtn}
              >
                <Ionicons
                  name="share-outline"
                  size={16}
                  color={PALETTE.purpleVibrant}
                />
                <Text style={styles.confirmShareText}>Enviar Pase</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCitaConfirmadaModal(null)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={[PALETTE.tealDeep, PALETTE.purpleVibrant]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmDoneBtn}
                >
                  <Text style={styles.confirmDoneText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => irAPantalla("PsicologoDashboard")}
        >
          <Ionicons name="people-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>Pacientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() =>
            irAPantalla("ExpedientePaciente", {
              paciente: pacienteSeleccionado || pacientes[0] || null,
            })
          }
        >
          <Ionicons name="document-text-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>Expediente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCenterWrapper}
          activeOpacity={0.9}
          onPress={() => irAPantalla("EjerciciosPsicologo")}
        >
          <LinearGradient
            colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.navCenterBtn}
          >
            <Ionicons name="barbell" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.navLabel, { marginTop: 3 }]}>Ejercicios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Ionicons name="calendar" size={21} color={PALETTE.purpleVibrant} />
          <Text
            style={[
              styles.navLabel,
              { color: PALETTE.purpleVibrant, fontWeight: "800" },
            ]}
          >
            Agenda
          </Text>
          <View style={styles.activeNavIndicator} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => irAPantalla("FlywheelQR")}
        >
          <Ionicons name="qr-code-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>QR & $0</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.indigoMuted,
  },
  heroHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    gap: 11,
  },
  heroBubbleOne: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroBubbleTwo: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(139, 193, 209, 0.22)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroDoctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  heroAvatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  heroAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  heroOnlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#34D399",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  heroCodeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heroCodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSub: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 1,
  },
  heroActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroNotifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  heroNotifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
  },
  heroNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8.5,
    borderRadius: 14,
    elevation: 3,
  },
  heroNewBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },

  // TARJETA DE PACIENTE + LUPA DESPLEGABLE
  selectedPatientBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: 18,
    padding: 11,
    gap: 10,
  },
  selectedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  selectedPatientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  selectedPatientAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  selectedPatientInitial: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  selectedTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#EDE9FE",
    letterSpacing: 0.4,
  },
  selectedNameChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  selectedEmptyText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
  },
  bannerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchPatientIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchPatientIconBtnActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  quickSchedulePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PALETTE.tealDeep,
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 12,
  },
  quickScheduleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  patientDropdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    gap: 8,
    elevation: 4,
  },
  patientDropdownSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    paddingHorizontal: 11,
    height: 38,
  },
  patientDropdownInput: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.textDark,
  },
  patientDropdownList: {
    maxHeight: 165,
  },
  patientDropdownEmpty: {
    fontSize: 12,
    color: PALETTE.textMuted,
    textAlign: "center",
    paddingVertical: 12,
  },
  patientDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  patientDropdownItemActive: {
    backgroundColor: "#F5F3FF",
  },
  dropdownItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dropdownItemAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItemInitial: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  dropdownItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  dropdownItemSub: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: PALETTE.bgCanvas,
    flexGrow: 1,
    gap: 13,
  },

  // CALENDARIO MENSUAL REDISEÑADO
  monthCalendarCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E4F8",
    gap: 10,
    elevation: 3,
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  monthHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  monthDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    elevation: 1,
  },
  monthTitleText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  todayPillBtn: {
    backgroundColor: PALETTE.purpleVibrant,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  monthPickerDropdownPanel: {
    backgroundColor: "#FAF8FF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  pickerSectionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.indigoMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  yearsRow: {
    flexDirection: "row",
    gap: 8,
  },
  yearChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  yearChipActive: {
    backgroundColor: PALETTE.indigoMuted,
    borderColor: PALETTE.indigoMuted,
  },
  yearChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  yearChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  monthOptionCell: {
    width: "23.2%",
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  monthOptionCellActive: {
    backgroundColor: PALETTE.purpleVibrant,
    borderColor: PALETTE.purpleVibrant,
  },
  monthOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  monthOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  weekDaysHeaderBar: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    borderRadius: 11,
  },
  weekDayHeaderCell: {
    width: "14.285%",
    alignItems: "center",
  },
  weekDayHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.textMuted,
  },
  monthGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthDayCell: {
    width: "14.285%",
    alignItems: "center",
    paddingVertical: 3,
  },
  monthDayPillActive: {
    width: 39,
    height: 41,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    elevation: 3,
  },
  monthDayPillInactive: {
    width: 39,
    height: 41,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  monthDayPillToday: {
    backgroundColor: "#EDF6F8",
    borderWidth: 1.5,
    borderColor: PALETTE.tealDeep,
  },
  monthDayPillWithCita: {
    backgroundColor: "#FAF5FF",
  },
  monthDayNumActive: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  monthDayNumInactive: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  monthDayNumToday: {
    color: PALETTE.tealDeep,
    fontWeight: "900",
  },
  monthDotActive: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
  },
  monthDotCita: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PALETTE.purpleVibrant,
  },
  monthDotHoy: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: PALETTE.tealDeep,
  },
  monthDotPlaceholder: {
    width: 4,
    height: 4,
  },
  calendarFooterLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  monthSummaryText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.indigoMuted,
  },

  modalityCompactCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E8E4F8",
    gap: 9,
  },
  modalityToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  modPillTealActive: {
    backgroundColor: PALETTE.tealDeep,
  },
  modPillPurpleActive: {
    backgroundColor: PALETTE.purpleVibrant,
  },
  modPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  shareChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
  },
  shareChipText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: PALETTE.indigoMuted,
  },
  locationMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  locationMiniText: {
    fontSize: 11.5,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
  locationInput: {
    flex: 1,
    fontSize: 12,
    color: PALETTE.textDark,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.tealDeep,
    paddingVertical: 1,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayHeadingText: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  summaryBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 999,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  appointmentCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E4F8",
    flexDirection: "row",
    overflow: "hidden",
    elevation: 2,
  },
  appointmentCardSelected: {
    borderColor: PALETTE.purpleVibrant,
    borderWidth: 1.5,
  },
  appointmentAccentBar: {
    width: 5,
  },
  appointmentBody: {
    flex: 1,
    padding: 15,
    gap: 12,
  },
  appointmentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  timeAndTagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },
  appointmentTime: {
    fontSize: 13,
    fontWeight: "900",
  },
  modalityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modalityBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  patientSessionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  appointmentMotivo: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: PALETTE.lavenderSoft,
  },
  patientAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarInitials: {
    fontSize: 14,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  appointmentFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  reminderConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  reminderConfirmText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8.5,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  deleteBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteHintText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#991B1B",
  },
  deleteCitaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 9,
  },
  deleteCitaBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  emptyAgendaCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E4F8",
    gap: 8,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  modalSub: {
    fontSize: 12,
    color: PALETTE.purpleVibrant,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  selectedPatientPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
  },
  previewBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.purpleVibrant,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadgeAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PALETTE.purpleVibrant,
  },
  previewBadgeLetter: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  previewPatientName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  previewPatientMeta: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  patientChipsScroll: {
    gap: 8,
    paddingVertical: 8,
  },
  patientSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  patientSelectChipActive: {
    backgroundColor: PALETTE.purpleVibrant,
    borderColor: PALETTE.purpleVibrant,
  },
  patientSelectChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  hourHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  hourPreviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hourPreviewText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  turnoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  turnoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  turnoBtnMananaActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  turnoBtnTardeActive: {
    backgroundColor: PALETTE.indigoMuted,
    borderColor: PALETTE.indigoMuted,
  },
  turnoBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  subSectionTimeLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
    marginTop: 6,
    marginBottom: 5,
  },
  pickersRow: {
    flexDirection: "row",
    gap: 10,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 2,
  },
  pickerMiniLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: PALETTE.textMuted,
    marginLeft: 4,
  },
  pickerInnerWrapper: {
    height: 48,
    justifyContent: "center",
    marginTop: -6,
  },
  pickerControl: {
    height: 54,
    width: "100%",
    color: PALETTE.textDark,
  },
  modalModalityRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalModalityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  modalModalityBtnPurple: {
    backgroundColor: PALETTE.purpleVibrant,
    borderColor: PALETTE.purpleVibrant,
  },
  modalModalityBtnTeal: {
    backgroundColor: PALETTE.tealDeep,
    borderColor: PALETTE.tealDeep,
  },
  modalModalityText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  objetivosVerticalList: {
    gap: 8,
  },
  objetivoRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  objetivoRowCardActive: {
    backgroundColor: "#EDF6F8",
    borderColor: PALETTE.tealDeep,
  },
  objetivoIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
  },
  objetivoRowText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  objetivoRowTextActive: {
    color: PALETTE.tealDeep,
    fontWeight: "800",
  },
  otroEnfoqueInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: PALETTE.tealDeep,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13,
    color: PALETTE.textDark,
    backgroundColor: "#FFFFFF",
  },
  saveCitaBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveCitaBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  confirmTopBanner: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  confirmIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  confirmSuccessBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: PALETTE.purpleVibrant,
    letterSpacing: 0.5,
  },
  cancelBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  cancelBadgePillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#E11D48",
    letterSpacing: 0.5,
  },
  deleteModalIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  psiCancelReasonInput: {
    width: "100%",
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFBFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: PALETTE.textDark,
    textAlignVertical: "top",
  },
  deleteConfirmActionBtn: {
    flex: 1.25,
    paddingVertical: 12.5,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: {
    fontSize: 17.5,
    fontWeight: "900",
    color: PALETTE.textDark,
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  confirmTicketBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E4F8",
    gap: 9,
  },
  confirmTicketRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  confirmTicketText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textDark,
    flex: 1,
  },
  confirmActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 2,
  },
  confirmShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
  },
  confirmShareText: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  confirmDoneBtn: {
    paddingVertical: 12.5,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmDoneText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyNotifContainer: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 6,
  },
  notifPsiCard: {
    backgroundColor: "#FFFBFB",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 5,
  },
  notifPsiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifPsiTag: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  notifPsiTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  notifPsiDate: {
    fontSize: 11,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
  notifPsiTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  notifPsiMeta: {
    fontSize: 12,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
  notifPsiMotivo: {
    fontSize: 12.5,
    color: "#991B1B",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 10,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.cardWhite,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#E8E4F8",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2.5,
  },
  activeNavIndicator: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: PALETTE.purpleVibrant,
    marginTop: 1,
  },
  navCenterWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  navCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: PALETTE.cardWhite,
    elevation: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
});