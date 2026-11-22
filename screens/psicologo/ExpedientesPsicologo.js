import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";

const PALETTE = {
  tealDeep: "#6192A4",
  tealMid: "#8BC1D1",
  lavenderSoft: "#CEC7FD",
  purpleVibrant: "#A374CC",
  indigoMuted: "#7E83C2",
  bgCanvas: "#F6F7FB",
  cardWhite: "#FFFFFF",
  textDark: "#1E1B4B",
  textMuted: "#64748B",
};

// Catálogo CIE-11 frecuente para selección rápida (NOM-024 6.4.2)
const CATALOGO_CIE11 = [
  "6B00 — Trastorno de ansiedad generalizada",
  "6B01 — Trastorno de pánico",
  "6B04 — Trastorno de ansiedad social",
  "6A70 — Episodio depresivo único",
  "6A71 — Trastorno depresivo recurrente",
  "6B40 — Trastorno de estrés postraumático (TEPT)",
  "6B43 — Trastorno de adaptación",
  "6B20 — Trastorno obsesivo-compulsivo",
  "QD85 — Síndrome de desgaste ocupacional (Burnout)",
  "QE50 — Problemas asociados con relaciones interpersonales",
  "Z03.8 — En observación / Valoración diagnóstica en curso",
];

const OPCIONES_SEXO = ["Femenino", "Masculino", "No binario", "Prefiero no decir"];
const OPCIONES_ESCOLARIDAD = [
  "Primaria",
  "Secundaria",
  "Preparatoria / Bachillerato",
  "Licenciatura (en curso)",
  "Licenciatura (concluida)",
  "Posgrado",
];
const OPCIONES_ESTADO_CIVIL = [
  "Soltero(a)",
  "Casado(a)",
  "Unión libre",
  "Divorciado(a)",
  "Viudo(a)",
];
const OPCIONES_RIESGO = [
  "Sin riesgo aparente (Nulo)",
  "Riesgo leve (Ideación pasiva sin plan)",
  "Riesgo moderado (Requiere plan de seguridad)",
  "Riesgo alto (Activación de protocolo / derivación urgente)",
];
const OPCIONES_PRONOSTICO = [
  "Favorable a corto plazo",
  "Favorable a mediano plazo sujeto a adherencia",
  "Reservado (requiere valoración interdisciplinaria)",
];
const OPCIONES_ENFOQUE = [
  "Terapia Cognitivo-Conductual (TCC)",
  "Terapia de Aceptación y Compromiso (ACT)",
  "Terapia Sistémica / Familiar",
  "Terapia Humanista / Centrada en la Persona",
  "Terapia Psicodinámica",
  "Intervención en Crisis / Primeros Auxilios Psicológicos",
];
const OPCIONES_FRECUENCIA = [
  "Semanal (1 sesión por semana)",
  "Quincenal (cada 15 días)",
  "2 veces por semana",
  "Mensual (seguimiento)",
];
const OPCIONES_ESTADO_MENTAL = {
  apariencia: ["Aliñado y cooperador", "Inquieto / tenso", "Inhibido / retraído"],
  lenguaje: ["Coherente y fluido", "Taquilálico (acelerado)", "Bradilálico (lento)"],
  afecto: ["Eutímico (estable)", "Ansioso / preocupado", "Hipotímico (triste)", "Lábil"],
  orientacion: ["Orientado en tiempo, espacio y persona", "Desorientación parcial"],
  juicio: ["Conservado con adecuada introspección", "Introspección parcial"],
};

const HISTORIA_DEFAULT = {
  folio: "",
  tipoFormato: "adulto", // adulto (Formato A) | menor (Formato B)
  // 1.1 Establecimiento
  nombreConsultorio: "Consultorio Psicológico Lami",
  domicilioConsultorio: "Atención presencial y telepsicología vía App Lami",
  // 1.2 Ficha identificación
  curp: "",
  fechaNacimiento: "",
  edad: "",
  sexo: "",
  estadoCivil: "",
  escolaridad: "",
  ocupacion: "",
  domicilioPaciente: "",
  lenguaIndigena: "Ninguna / Español",
  contactoEmergencia: "",
  parentescoEmergencia: "",
  telefonoEmergencia: "",
  personaAutorizadaInfo: "",
  // 1.2B Exclusivo Menores (Formato B - LGDNNA)
  grupoEtarioMenor: "Adolescente (12 a 17 años)",
  conQuienVive: "",
  escuelaGrado: "",
  ajustesDiscapacidad: "Ninguno",
  nombreTutor: "",
  parentescoTutor: "Madre / Padre",
  telefonoTutor: "",
  documentoPatriaPotestad: "Acta de nacimiento / Identificación oficial",
  restriccionesCustodia: "Ninguna referida",
  // 1.3 Consentimientos (NOM-004 10.1 / LFPDPPP)
  avisoPrivacidadEntregado: false,
  consentimientoDatosSensibles: false,
  consentimientoInformado: false,
  consentimientoTelepsicologia: false,
  limitesConfidencialidadExplicados: false,
  asentimientoMenor: false,
  fechaConsentimiento: "",
  // 2.1 Interrogatorio
  quienRefiere: "Iniciativa propia",
  motivoConsulta: "",
  padecimientoActual: "",
  tratamientosPrevios: "Ninguno",
  antecedentesHeredofamiliares: "",
  antecedentesPatologicos: "",
  consumoSustancias: "Niega consumo de tabaco, alcohol u otras sustancias",
  antecedentesNoPatologicos: "",
  antecedentesViolenciaTrauma: "Niega antecedentes de violencia o trauma agudo",
  // 2.2 Riesgo y Examen Mental
  nivelRiesgoSuicida: "Sin riesgo aparente (Nulo)",
  detalleRiesgo: "",
  riesgoTerceros: "Sin riesgo hacia terceros",
  emApariencia: "Aliñado y cooperador",
  emLenguaje: "Coherente y fluido",
  emAfecto: "Ansioso / preocupado",
  emOrientacion: "Orientado en tiempo, espacio y persona",
  emJuicio: "Conservado con adecuada introspección",
  examenMentalNotas: "",
  // 3.1 Diagnóstico, Pronóstico y Plan
  impresionDiagnostica: "",
  diagnosticoDiferencial: "",
  pronostico: "Favorable a mediano plazo sujeto a adherencia",
  enfoqueTerapeutico: "Terapia Cognitivo-Conductual (TCC)",
  frecuenciaSesiones: "Semanal (1 sesión por semana)",
  modalidadAtencion: "Mixta (Presencial y Virtual)",
  planTerapeutico: "",
  criteriosDerivacion: "Ideación autolítica activa o descompensación aguda",
  planCrisis: "Contacto de emergencia + Línea de la Vida (800 911 2000)",
};

function formatearFechaCorta(fechaInput) {
  if (!fechaInput) return "Sin registro";
  if (typeof fechaInput === "string") return fechaInput;
  if (fechaInput?.seconds) {
    const d = new Date(fechaInput.seconds * 1000);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return "Sin registro";
}

function escaparHtml(txt = "") {
  return String(txt ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Componente reutilizable de Chips seleccionables
function ChipSelector({ label, options, value, onSelect }) {
  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.chipsWrap}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.8}
              onPress={() => onSelect(opt)}
              style={[styles.choiceChip, selected && styles.choiceChipSelected]}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  selected && styles.choiceChipTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Componente reutilizable de Acordeón Desplegable
function AccordionSection({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badgeText,
  expanded,
  onToggle,
  children,
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onToggle}
        style={styles.accordionHeader}
      >
        <View style={[styles.cardIconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            {badgeText ? (
              <View style={styles.normaBadge}>
                <Text style={styles.normaBadgeText}>{badgeText}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={PALETTE.indigoMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function ExpedientesPsicologo({ route }) {
  const uid = auth.currentUser?.uid;
  const scrollDetalleRef = useRef(null);
  const scrollModalNotaRef = useRef(null);
  const [tecladoAltura, setTecladoAltura] = useState(0);

  const [psicologoInfo, setPsicologoInfo] = useState({
    nombre: auth.currentUser?.displayName || "Especialista Lami",
    cedulaProfesional: "",
    especialidad: "Psicología Clínica",
    codigoVinculacion: "PSI-492",
    fotoPerfil: null,
  });

  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargandoLista, setCargandoLista] = useState(true);

  const [pacienteActivo, setPacienteActivo] = useState(null);
  const [tabActiva, setTabActiva] = useState("seguimiento");
  const [cargandoExpediente, setCargandoExpediente] = useState(false);

  // Control de secciones desplegables en Historia Clínica
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    identificacion: true,
    consentimientos: false,
    interrogatorio: true,
    riesgoMental: false,
    diagnosticoPlan: true,
  });
  const [mostrarCatalogoCIE, setMostrarCatalogoCIE] = useState(false);

  const [historia, setHistoria] = useState(HISTORIA_DEFAULT);
  const [guardandoHistoria, setGuardandoHistoria] = useState(false);

  const [notas, setNotas] = useState([]);
  const [modalNuevaNota, setModalNuevaNota] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [notaForm, setNotaForm] = useState({
    modalidad: "Presencial",
    verificacionVirtual: "Identidad verificada, espacio privado sin interrupciones",
    subjetivo: "",
    objetivo: "",
    analisis: "",
    actualizacionRiesgo: "Sin cambios (Sin riesgo aparente)",
    plan: "",
  });

  const [seguimiento, setSeguimiento] = useState({
    emociones: [],
    promedioAnsiedad: "0.0",
    totalCheckings: 0,
    totalSesionesCitas: 0,
    rachaCalma: 0,
    ejerciciosCompletados: 0,
  });

  const [modalConfirmacion, setModalConfirmacion] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
  });
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setTecladoAltura(e.endCoordinates?.height || 280)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setTecladoAltura(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const toggleSeccion = (key) => {
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Detecta automáticamente si es menor de 18 años para activar Formato B (LGDNNA)
  const actualizarEdadYFormato = (edadTexto) => {
    const num = parseInt(String(edadTexto).replace(/\D/g, ""), 10);
    setHistoria((prev) => ({
      ...prev,
      edad: edadTexto,
      tipoFormato: !isNaN(num) && num > 0 && num < 18 ? "menor" : "adulto",
      grupoEtarioMenor:
        !isNaN(num) && num < 12
          ? "Niña o niño (menor de 12 años)"
          : "Adolescente (12 a 17 años)",
    }));
  };

  const abrirExpedientePaciente = useCallback(
    async (paciente) => {
      setPacienteActivo(paciente);
      setTabActiva("seguimiento");
      setCargandoExpediente(true);

      try {
        const expRef = doc(db, "expedientes", paciente.id);
        const expSnap = await getDoc(expRef);
        if (expSnap.exists()) {
          setHistoria({
            ...HISTORIA_DEFAULT,
            ...expSnap.data(),
            folio:
              expSnap.data()?.folio ||
              `EXP-${paciente.id.slice(0, 5).toUpperCase()}`,
          });
        } else {
          setHistoria({
            ...HISTORIA_DEFAULT,
            folio: `EXP-${paciente.id.slice(0, 5).toUpperCase()}`,
          });
        }

        const notasSnap = await getDocs(
          collection(db, "expedientes", paciente.id, "notas")
        );
        const listaNotas = notasSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0)
          );
        setNotas(listaNotas);

        let registrosEmociones = [];
        const rutasSubcoleccion = ["checkins", "checkings", "emociones"];

        for (const subCol of rutasSubcoleccion) {
          if (registrosEmociones.length > 0) break;
          try {
            const snapSub = await getDocs(
              collection(db, "usuarios", paciente.id, subCol)
            );
            if (!snapSub.empty) {
              registrosEmociones = snapSub.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }));
            }
          } catch (_) {}
        }

        if (registrosEmociones.length === 0) {
          const coleccionesRaiz = ["checkins", "checkings", "emociones"];
          const camposUsuario = ["usuarioId", "uid", "pacienteId"];

          for (const colRaiz of coleccionesRaiz) {
            if (registrosEmociones.length > 0) break;
            for (const campo of camposUsuario) {
              try {
                const qEm = query(
                  collection(db, colRaiz),
                  where(campo, "==", paciente.id)
                );
                const snapRaiz = await getDocs(qEm);
                if (!snapRaiz.empty) {
                  registrosEmociones = snapRaiz.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                  }));
                  break;
                }
              } catch (_) {}
            }
          }
        }

        const userSnap = await getDoc(doc(db, "usuarios", paciente.id));
        const userData = userSnap.exists() ? userSnap.data() : {};

        if (
          registrosEmociones.length === 0 &&
          (userData.ultimoAnimo !== undefined ||
            userData.ultimoCheckinNota ||
            userData.ultimoCheckinFecha)
        ) {
          registrosEmociones.push({
            id: "ultimo-checkin",
            emocion: userData.ultimaEmocion || "Estado reciente",
            nivel: Number(userData.ultimoAnimo ?? 5),
            nota: userData.ultimoCheckinNota || "",
            fecha: userData.ultimoCheckinFecha || "Reciente",
          });
        }

        registrosEmociones.sort(
          (a, b) =>
            (b.creadoEn?.seconds || b.fechaTimestamp?.seconds || 0) -
            (a.creadoEn?.seconds || a.fechaTimestamp?.seconds || 0)
        );

        let sumaNivel = 0;
        let conteoNivel = 0;
        registrosEmociones.forEach((item) => {
          const val = Number(
            item.nivelAnsiedad ??
              item.intensidad ??
              item.nivel ??
              item.animo ??
              0
          );
          if (val > 0) {
            sumaNivel += val;
            conteoNivel += 1;
          }
        });

        const promedio =
          conteoNivel > 0 ? (sumaNivel / conteoNivel).toFixed(1) : "0.0";

        let totalCitas = 0;
        try {
          const qCitas = query(
            collection(db, "solicitudes_sesion"),
            where("pacienteId", "==", paciente.id),
            where("psicologoId", "==", uid)
          );
          const citasSnap = await getDocs(qCitas);
          totalCitas = citasSnap.docs.filter((d) =>
            ["cita_aceptada", "confirmada", "completada"].includes(
              d.data()?.estado
            )
          ).length;
        } catch (_) {}

        let ejerciciosHechos = Number(
          userData.ejerciciosCompletados || userData.sesionesCompletadas || 0
        );
        if (ejerciciosHechos === 0) {
          try {
            const qEj = query(
              collection(db, "ejercicios_asignados"),
              where("pacienteId", "==", paciente.id)
            );
            const ejSnap = await getDocs(qEj);
            ejerciciosHechos = ejSnap.docs.filter(
              (d) =>
                d.data()?.completado === true ||
                d.data()?.estado === "completado"
            ).length;
          } catch (_) {}
        }

        setSeguimiento({
          emociones: registrosEmociones.slice(0, 12),
          promedioAnsiedad: promedio,
          totalCheckings: registrosEmociones.length,
          totalSesionesCitas: Math.max(totalCitas, listaNotas.length),
          rachaCalma: Number(userData.rachaCalma || userData.racha || 0),
          ejerciciosCompletados: ejerciciosHechos,
        });
      } catch (e) {
        console.warn("Error cargando expediente:", e);
        Alert.alert(
          "Aviso",
          "Algunos datos del expediente no pudieron cargarse."
        );
      } finally {
        setCargandoExpediente(false);
      }
    },
    [uid]
  );

  const cargarDatosIniciales = useCallback(async () => {
    if (!uid) {
      setCargandoLista(false);
      return;
    }

    try {
      setCargandoLista(true);

      const psiSnap = await getDoc(doc(db, "psicologos", uid));
      if (psiSnap.exists()) {
        const d = psiSnap.data();
        setPsicologoInfo({
          nombre: d.nombre || auth.currentUser?.displayName || "Especialista",
          cedulaProfesional: d.cedulaProfesional || d.cedula || "En trámite",
          especialidad: d.especialidad || "Psicología Clínica",
          codigoVinculacion: d.codigoVinculacion || "PSI-492",
          fotoPerfil: d.fotoPerfil || null,
        });
      }

      const qPacientes = query(
        collection(db, "usuarios"),
        where("psicologoId", "==", uid)
      );
      const snapPacientes = await getDocs(qPacientes);

      const lista = await Promise.all(
        snapPacientes.docs.map(async (docItem) => {
          const pData = docItem.data();
          let tieneExpediente = false;
          let folio = "";
          let diagnostico = "";
          try {
            const expSnap = await getDoc(doc(db, "expedientes", docItem.id));
            if (expSnap.exists()) {
              tieneExpediente = Boolean(expSnap.data()?.motivoConsulta);
              folio = expSnap.data()?.folio || "";
              diagnostico = expSnap.data()?.impresionDiagnostica || "";
            }
          } catch (_) {}

          return {
            id: docItem.id,
            nombre: pData.nombre || "Paciente Lami",
            correo: pData.correo || "",
            telefono: pData.telefono || "",
            fotoPerfil: pData.fotoPerfil || null,
            tieneExpediente,
            diagnostico,
            folio: folio || `EXP-${docItem.id.slice(0, 5).toUpperCase()}`,
          };
        })
      );

      setPacientes(lista);

      const paramPacienteId =
        route?.params?.pacienteId || route?.params?.paciente?.id;
      if (paramPacienteId) {
        const encontrado = lista.find((p) => p.id === paramPacienteId);
        if (encontrado) {
          abrirExpedientePaciente(encontrado);
        }
      }
    } catch (e) {
      console.warn("Error cargando pacientes para expedientes:", e);
      Alert.alert("Error", "No se pudo cargar la lista de expedientes.");
    } finally {
      setCargandoLista(false);
    }
  }, [
    uid,
    route?.params?.pacienteId,
    route?.params?.paciente?.id,
    abrirExpedientePaciente,
  ]);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);

  const handleGuardarHistoria = async () => {
    if (!pacienteActivo || !uid) return;
    if (!historia.motivoConsulta.trim()) {
      Alert.alert(
        "Motivo requerido",
        "Escribe al menos el motivo de consulta en la sección de Interrogatorio para guardar."
      );
      setSeccionesAbiertas((p) => ({ ...p, interrogatorio: true }));
      return;
    }

    try {
      setGuardandoHistoria(true);
      const fechaHoy = new Date().toLocaleDateString("es-MX");
      const algunConsentimiento =
        historia.consentimientoInformado ||
        historia.consentimientoDatosSensibles ||
        historia.avisoPrivacidadEntregado;

      const payload = {
        ...historia,
        pacienteId: pacienteActivo.id,
        pacienteNombre: pacienteActivo.nombre,
        psicologoId: uid,
        psicologoNombre: psicologoInfo.nombre,
        cedulaPsicologo: psicologoInfo.cedulaProfesional,
        fechaConsentimiento: algunConsentimiento
          ? historia.fechaConsentimiento || fechaHoy
          : "",
        actualizadoEn: serverTimestamp(),
      };

      await setDoc(doc(db, "expedientes", pacienteActivo.id), payload, {
        merge: true,
      });

      setHistoria(payload);
      setPacientes((prev) =>
        prev.map((p) =>
          p.id === pacienteActivo.id
            ? {
                ...p,
                tieneExpediente: true,
                diagnostico: payload.impresionDiagnostica || "",
              }
            : p
        )
      );

      setModalConfirmacion({
        visible: true,
        titulo: "¡Historia Clínica Guardada!",
        mensaje: `El expediente clínico (${payload.folio} • ${
          payload.tipoFormato === "menor"
            ? "Formato B - Menor de edad"
            : "Formato A - Adulto"
        }) quedó guardado conforme a la NOM-004-SSA3-2012.`,
      });
    } catch (e) {
      Alert.alert(
        "Error",
        "No se pudo guardar la historia clínica: " + e.message
      );
    } finally {
      setGuardandoHistoria(false);
    }
  };

  const handleAgregarNota = async () => {
    if (!pacienteActivo || !uid) return;
    if (!notaForm.subjetivo.trim() && !notaForm.analisis.trim()) {
      Alert.alert(
        "Campos incompletos",
        "Completa al menos el apartado Subjetivo o Análisis/Intervención de la nota."
      );
      return;
    }

    try {
      setGuardandoNota(true);
      const ahora = new Date();
      const fechaTexto = ahora.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const horaTexto = ahora.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const nuevaNota = {
        numeroSesion: notas.length + 1,
        fechaTexto,
        horaTexto,
        modalidad: notaForm.modalidad,
        verificacionVirtual:
          notaForm.modalidad === "En línea"
            ? notaForm.verificacionVirtual.trim()
            : "",
        subjetivo: notaForm.subjetivo.trim(),
        objetivo: notaForm.objetivo.trim(),
        analisis: notaForm.analisis.trim(),
        actualizacionRiesgo: notaForm.actualizacionRiesgo,
        plan: notaForm.plan.trim(),
        psicologoId: uid,
        psicologoNombre: psicologoInfo.nombre,
        cedulaPsicologo: psicologoInfo.cedulaProfesional,
        creadoEn: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "expedientes", pacienteActivo.id, "notas"),
        nuevaNota
      );

      setNotas((prev) => [
        {
          id: docRef.id,
          ...nuevaNota,
          creadoEn: { seconds: Math.floor(Date.now() / 1000) },
        },
        ...prev,
      ]);

      setNotaForm({
        modalidad: "Presencial",
        verificacionVirtual:
          "Identidad verificada, espacio privado sin interrupciones",
        subjetivo: "",
        objetivo: "",
        analisis: "",
        actualizacionRiesgo: "Sin cambios (Sin riesgo aparente)",
        plan: "",
      });
      setModalNuevaNota(false);

      setModalConfirmacion({
        visible: true,
        titulo: "¡Nota de Evolución Registrada!",
        mensaje: `La nota SOAP de la sesión #${nuevaNota.numeroSesion} se anexó de forma inalterable (NOM-024) al expediente.`,
      });
    } catch (e) {
      Alert.alert(
        "Error",
        "No se pudo guardar la nota de evolución: " + e.message
      );
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!pacienteActivo) return;

    try {
      setGenerandoPdf(true);
      const esMenor = historia.tipoFormato === "menor";
      const fechaEmision = new Date().toLocaleString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const seccionRepresentacionHtml = esMenor
        ? `
        <div class="section-title">I-B. Representación Legal y Asentimiento del Menor (LGDNNA)</div>
        <table class="data-table">
          <tr>
            <td class="lbl">Grupo etario</td>
            <td>${escaparHtml(historia.grupoEtarioMenor)}</td>
            <td class="lbl">Con quién vive / Escuela</td>
            <td>${escaparHtml(historia.conQuienVive || "N/E")} • ${escaparHtml(
              historia.escuelaGrado || "N/E"
            )}</td>
          </tr>
          <tr>
            <td class="lbl">Madre, padre o tutor</td>
            <td>${escaparHtml(historia.nombreTutor || "No registrado")} (${escaparHtml(
              historia.parentescoTutor || "Tutor"
            )})</td>
            <td class="lbl">Teléfono tutor</td>
            <td>${escaparHtml(historia.telefonoTutor || "No registrado")}</td>
          </tr>
          <tr>
            <td class="lbl">Acreditación patria potestad</td>
            <td>${escaparHtml(historia.documentoPatriaPotestad || "N/E")}</td>
            <td class="lbl">Restricciones / Custodia</td>
            <td>${escaparHtml(historia.restriccionesCustodia || "Ninguna")}</td>
          </tr>
          <tr>
            <td class="lbl">Asentimiento del menor</td>
            <td colspan="3">${
              historia.asentimientoMenor
                ? "Expresado conforme a su edad, desarrollo y madurez (LGDNNA art. 2-II)"
                : "Pendiente de documentar"
            }</td>
          </tr>
        </table>
      `
        : "";

      const notasHtml =
        notas.length === 0
          ? `<div class="empty-note">Aún no se registran notas de evolución en este expediente clínico.</div>`
          : notas
              .slice()
              .reverse()
              .map(
                (n, idx) => `
          <table class="soap-table">
            <tr>
              <th colspan="2" class="soap-header">
                SESIÓN #${n.numeroSesion || idx + 1} &nbsp;|&nbsp; FECHA: ${escaparHtml(
                  n.fechaTexto
                )} (${escaparHtml(n.horaTexto || "")}) &nbsp;|&nbsp; MODALIDAD: ${escaparHtml(
                  (n.modalidad || "Presencial").toUpperCase()
                )}
              </th>
            </tr>
            ${
              n.verificacionVirtual
                ? `<tr><td class="soap-key">TELEPSICOLOGÍA</td><td class="soap-val">${escaparHtml(
                    n.verificacionVirtual
                  )}</td></tr>`
                : ""
            }
            <tr>
              <td class="soap-key">S — SUBJETIVO</td>
              <td class="soap-val">${escaparHtml(n.subjetivo || "Sin registro")}</td>
            </tr>
            <tr>
              <td class="soap-key">O — OBJETIVO</td>
              <td class="soap-val">${escaparHtml(n.objetivo || "Sin registro")}</td>
            </tr>
            <tr>
              <td class="soap-key">A — ANÁLISIS</td>
              <td class="soap-val">${escaparHtml(n.analisis || "Sin registro")}</td>
            </tr>
            <tr>
              <td class="soap-key">RIESGO ACTUALIZADO</td>
              <td class="soap-val">${escaparHtml(
                n.actualizacionRiesgo || "Sin cambios"
              )}</td>
            </tr>
            <tr>
              <td class="soap-key">P — PLAN E INDICACIONES</td>
              <td class="soap-val">${escaparHtml(n.plan || "Sin registro")}</td>
            </tr>
          </table>
        `
              )
              .join("");

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 16mm 14mm; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: #1E1B4B;
      font-size: 10.5px;
      line-height: 1.42;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 3px solid #6192A4;
      margin-bottom: 14px;
    }
    .header-table td { border: none; padding: 0 0 10px 0; vertical-align: top; }
    .brand { font-size: 16px; font-weight: bold; color: #1E1B4B; }
    .norma-tag { font-size: 9px; font-weight: bold; color: #6192A4; text-transform: uppercase; margin-top: 2px; }
    .prof-info { font-size: 10px; color: #334155; margin-top: 6px; }
    .folio-box {
      background-color: #F5F3FF;
      border: 1px solid #CEC7FD;
      padding: 7px 10px;
      text-align: right;
    }
    .folio-num { font-size: 11.5px; font-weight: bold; color: #6B21A8; }
    .section-title {
      background-color: #EEF2FF;
      color: #1E1B4B;
      border-left: 4px solid #6192A4;
      padding: 5px 9px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 14px;
      margin-bottom: 7px;
    }
    .data-table, .clinical-table, .soap-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 9px;
    }
    .data-table td, .clinical-table td, .soap-table td {
      border: 1px solid #CBD5E1;
      padding: 5px 8px;
      vertical-align: top;
    }
    .lbl, .soap-key {
      background-color: #F8FAFC;
      font-weight: bold;
      color: #334155;
      width: 24%;
    }
    .clinical-table th {
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 4px 8px;
      text-align: left;
      color: #334155;
      font-size: 10px;
      text-transform: uppercase;
    }
    .soap-header {
      background-color: #6192A4;
      color: #FFFFFF;
      padding: 5px 8px;
      text-align: left;
      font-size: 10px;
      border: 1px solid #6192A4;
    }
    .empty-note { border: 1px dashed #CBD5E1; padding: 9px; color: #64748B; font-style: italic; }
    .firma-table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    .firma-table td { border: none; text-align: center; padding-top: 8px; }
    .firma-linea { width: 230px; border-top: 1px solid #1E1B4B; margin: 0 auto 4px auto; }
    .legal {
      margin-top: 16px;
      border-top: 1px solid #CBD5E1;
      padding-top: 7px;
      font-size: 8.5px;
      color: #64748B;
      text-align: justify;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="brand">EXPEDIENTE CLÍNICO PSICOLÓGICO (${
          esMenor ? "FORMATO B • MENOR DE EDAD" : "FORMATO A • ADULTO"
        })</div>
        <div class="norma-tag">${escaparHtml(
          historia.nombreConsultorio || "Plataforma Clínica Lami"
        )} &bull; NOM-004-SSA3-2012 &bull; NOM-024-SSA3-2012</div>
        <div class="prof-info">
          <strong>Psicólogo(a) tratante:</strong> ${escaparHtml(psicologoInfo.nombre)} &nbsp;|&nbsp;
          <strong>Cédula:</strong> ${escaparHtml(psicologoInfo.cedulaProfesional)}<br/>
          <strong>Especialidad:</strong> ${escaparHtml(psicologoInfo.especialidad)} &nbsp;|&nbsp;
          <strong>Modalidad:</strong> ${escaparHtml(historia.modalidadAtencion)}
        </div>
      </td>
      <td style="width:33%;text-align:right;">
        <div class="folio-box">
          <div class="folio-num">FOLIO: ${escaparHtml(historia.folio)}</div>
          <div style="font-size:9px;color:#475569;margin-top:2px;">Emisión: ${escaparHtml(
            fechaEmision
          )}</div>
        </div>
      </td>
    </tr>
  </table>

  <div class="section-title">I. Ficha de Identificación y Consentimientos (NOM-004 5.2 / LFPDPPP)</div>
  <table class="data-table">
    <tr>
      <td class="lbl">Nombre completo</td>
      <td>${escaparHtml(pacienteActivo.nombre)}</td>
      <td class="lbl">CURP</td>
      <td>${escaparHtml(historia.curp || "No registrada")}</td>
    </tr>
    <tr>
      <td class="lbl">Edad / F. Nacimiento</td>
      <td>${escaparHtml(historia.edad || "N/E")} ${
        historia.fechaNacimiento ? `(${escaparHtml(historia.fechaNacimiento)})` : ""
      }</td>
      <td class="lbl">Sexo / Estado Civil</td>
      <td>${escaparHtml(historia.sexo || "N/E")} • ${escaparHtml(
        historia.estadoCivil || "N/E"
      )}</td>
    </tr>
    <tr>
      <td class="lbl">Escolaridad / Ocupación</td>
      <td>${escaparHtml(historia.escolaridad || "N/E")} • ${escaparHtml(
        historia.ocupacion || "N/E"
      )}</td>
      <td class="lbl">Teléfono / Correo</td>
      <td>${escaparHtml(pacienteActivo.telefono || "N/E")} • ${escaparHtml(
        pacienteActivo.correo || "N/E"
      )}</td>
    </tr>
    <tr>
      <td class="lbl">Contacto de emergencia</td>
      <td colspan="3">${escaparHtml(
        historia.contactoEmergencia || "No registrado"
      )} (${escaparHtml(historia.parentescoEmergencia || "N/E")}) — Tel: ${escaparHtml(
        historia.telefonoEmergencia || "N/E"
      )}</td>
    </tr>
    <tr>
      <td class="lbl">Consentimientos</td>
      <td colspan="3">
        Aviso de privacidad: <strong>${
          historia.avisoPrivacidadEntregado ? "Entregado" : "Pendiente"
        }</strong> |
        Datos sensibles (LFPDPPP art. 8): <strong>${
          historia.consentimientoDatosSensibles ? "Autorizado" : "Pendiente"
        }</strong> |
        Atención psicológica y telepsicología: <strong>${
          historia.consentimientoInformado ? "Autorizado" : "Pendiente"
        }</strong> (${escaparHtml(historia.fechaConsentimiento || "Sin fecha")})
      </td>
    </tr>
  </table>

  ${seccionRepresentacionHtml}

  <div class="section-title">II. Historia Clínica Psicológica (NOM-004 6.1 y 5.16)</div>
  <table class="clinical-table">
    <tr><th>1. Motivo de Consulta (Refiere: ${escaparHtml(historia.quienRefiere)})</th></tr>
    <tr><td>${escaparHtml(historia.motivoConsulta || "Sin registrar")}</td></tr>
  </table>
  <table class="clinical-table">
    <tr><th>2. Padecimiento Actual (Inicio, curso, desencadenantes e impacto)</th></tr>
    <tr><td>${escaparHtml(historia.padecimientoActual || "Sin registrar")}</td></tr>
  </table>
  <table class="clinical-table">
    <tr><th>3. Antecedentes Heredofamiliares, Patológicos y Consumo de Sustancias</th></tr>
    <tr><td>
      <strong>Heredofamiliares:</strong> ${escaparHtml(
        historia.antecedentesHeredofamiliares || "Sin registrar"
      )}<br/>
      <strong>Patológicos / Tratamientos previos:</strong> ${escaparHtml(
        historia.antecedentesPatologicos || "Sin registrar"
      )} (${escaparHtml(historia.tratamientosPrevios)})<br/>
      <strong>Sustancias:</strong> ${escaparHtml(historia.consumoSustancias)}<br/>
      <strong>Violencia / Trauma:</strong> ${escaparHtml(
        historia.antecedentesViolenciaTrauma
      )}
    </td></tr>
  </table>

  <div class="section-title">III. Evaluación de Riesgo y Examen del Estado Mental (NOM-004 6.1.2)</div>
  <table class="data-table">
    <tr>
      <td class="lbl">Riesgo suicida / autolesión</td>
      <td><strong>${escaparHtml(historia.nivelRiesgoSuicida)}</strong></td>
      <td class="lbl">Riesgo para terceros</td>
      <td>${escaparHtml(historia.riesgoTerceros)}</td>
    </tr>
    <tr>
      <td class="lbl">Apariencia / Lenguaje</td>
      <td>${escaparHtml(historia.emApariencia)} • ${escaparHtml(
        historia.emLenguaje
      )}</td>
      <td class="lbl">Afecto / Orientación</td>
      <td>${escaparHtml(historia.emAfecto)} • ${escaparHtml(
        historia.emOrientacion
      )}</td>
    </tr>
    <tr>
      <td class="lbl">Juicio e introspección</td>
      <td colspan="3">${escaparHtml(historia.emJuicio)} ${
        historia.examenMentalNotas
          ? `— Obs: ${escaparHtml(historia.examenMentalNotas)}`
          : ""
      }</td>
    </tr>
    <tr>
      <td class="lbl">Exploración física</td>
      <td colspan="3">No aplica a la naturaleza del servicio de atención psicológica independiente (NOM-004, numeral 5.16).</td>
    </tr>
  </table>

  <div class="section-title">IV. Diagnóstico (CIE-11), Pronóstico y Plan Terapéutico</div>
  <table class="data-table">
    <tr>
      <td class="lbl">Impresión Diagnóstica (CIE)</td>
      <td colspan="3"><strong>${escaparHtml(
        historia.impresionDiagnostica || "En valoración"
      )}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Pronóstico (NOM-004 6.1.5)</td>
      <td>${escaparHtml(historia.pronostico)}</td>
      <td class="lbl">Enfoque y Frecuencia</td>
      <td>${escaparHtml(historia.enfoqueTerapeutico)} • ${escaparHtml(
        historia.frecuenciaSesiones
      )}</td>
    </tr>
    <tr>
      <td class="lbl">Plan Terapéutico</td>
      <td colspan="3">${escaparHtml(historia.planTerapeutico || "Sin registrar")}</td>
    </tr>
    <tr>
      <td class="lbl">Plan de Crisis y Derivación</td>
      <td colspan="3">${escaparHtml(historia.planCrisis)} | Derivación: ${escaparHtml(
        historia.criteriosDerivacion
      )}</td>
    </tr>
  </table>

  <div class="section-title">V. Notas de Evolución Clínica (NOM-004 6.2 • Formato SOAP)</div>
  ${notasHtml}

  <table class="firma-table">
    <tr>
      <td>
        <div class="firma-linea"></div>
        <strong>${escaparHtml(psicologoInfo.nombre)}</strong><br/>
        Cédula Profesional: ${escaparHtml(psicologoInfo.cedulaProfesional)}<br/>
        Firma del Especialista Responsable
      </td>
    </tr>
  </table>

  <div class="legal">
    <strong>AVISO DE CONFIDENCIALIDAD Y CONSERVACIÓN (NOM-004 5.4 / LFPDPPP):</strong> Este expediente clínico electrónico contiene datos personales sensibles de salud y deberá conservarse por un periodo mínimo de 5 años a partir del último acto clínico. Su reproducción o entrega a terceros sin autorización expresa por escrito del titular o representante legal está prohibida.
  </div>
</body>
</html>`;

      try {
        const resultado = await Print.printToFileAsync({
          html,
          base64: false,
        });

        if (resultado?.uri) {
          const puedeCompartir = await Sharing.isAvailableAsync();
          if (puedeCompartir) {
            await Sharing.shareAsync(resultado.uri, {
              mimeType: "application/pdf",
              dialogTitle: `Expediente_${pacienteActivo.nombre.replace(/\s+/g, "_")}.pdf`,
              UTI: "com.adobe.pdf",
            });
            return;
          }
        }
      } catch (errFile) {
        console.warn("Fallback a Print.printAsync:", errFile);
        await Print.printAsync({ html });
        return;
      }
    } catch (e) {
      console.warn("Error generando PDF:", e);
      Alert.alert(
        "No se pudo generar el PDF",
        "Verifica permisos de almacenamiento o intenta de nuevo."
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  const completosCount = pacientes.filter((p) => p.tieneExpediente).length;
  const pendientesCount = pacientes.length - completosCount;

  const pacientesFiltrados = pacientes.filter((p) => {
    const coincideNombre = p.nombre
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());
    if (!coincideNombre) return false;
    if (filtroEstado === "completos") return p.tieneExpediente;
    if (filtroEstado === "pendientes") return !p.tieneExpediente;
    return true;
  });

  // =========================================================================
  // VISTA 2: EXPEDIENTE DETALLADO DEL PACIENTE SELECCIONADO
  // =========================================================================
  if (pacienteActivo) {
    const esMenor = historia.tipoFormato === "menor";

    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={PALETTE.indigoMuted}
        />

        <LinearGradient
          colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant, PALETTE.tealDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailHeader}
        >
          <View style={styles.detailHeaderTop}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setPacienteActivo(null);
              }}
              style={styles.iconCircleBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.detailEyebrow}>
                {historia.folio} • {esMenor ? "FORMATO B (MENOR)" : "FORMATO A (ADULTO)"}
              </Text>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {pacienteActivo.nombre}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleExportarPDF}
              disabled={generandoPdf}
              style={styles.pdfHeaderBtn}
              activeOpacity={0.85}
            >
              {generandoPdf ? (
                <ActivityIndicator size="small" color={PALETTE.indigoMuted} />
              ) : (
                <>
                  <Ionicons
                    name="document-text"
                    size={16}
                    color={PALETTE.indigoMuted}
                  />
                  <Text style={styles.pdfHeaderBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tabsRow}>
            {[
              { id: "seguimiento", label: "Seguimiento", icon: "pulse" },
              { id: "historia", label: "Historia Clínica", icon: "clipboard" },
              { id: "notas", label: `Notas (${notas.length})`, icon: "create" },
            ].map((t) => {
              const activa = tabActiva === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    Keyboard.dismiss();
                    setTabActiva(t.id);
                  }}
                  style={[styles.tabPill, activa && styles.tabPillActive]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={activa ? t.icon : `${t.icon}-outline`}
                    size={15}
                    color={activa ? PALETTE.indigoMuted : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.tabPillText,
                      activa && styles.tabPillTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {cargandoExpediente ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PALETTE.purpleVibrant} />
            <Text style={styles.loadingText}>
              Cargando expediente y métricas...
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: PALETTE.bgCanvas }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
          >
            <ScrollView
              ref={scrollDetalleRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: tecladoAltura > 0 ? tecladoAltura + 90 : 120 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* PESTAÑA 1: SEGUIMIENTO */}
              {tabActiva === "seguimiento" && (
                <>
                  <View style={styles.kpiGrid}>
                    <LinearGradient
                      colors={["#FFFFFF", "#EFE9FE"]}
                      style={styles.kpiCard}
                    >
                      <Text style={styles.kpiLabel}>Ansiedad promedio</Text>
                      <Text style={styles.kpiValue}>
                        {seguimiento.promedioAnsiedad}
                        <Text style={styles.kpiUnit}> / 10</Text>
                      </Text>
                      <Text style={styles.kpiHint}>
                        Basado en {seguimiento.totalCheckings} checkings
                      </Text>
                    </LinearGradient>

                    <LinearGradient
                      colors={["#FFFFFF", "#E0F2F1"]}
                      style={styles.kpiCard}
                    >
                      <Text style={styles.kpiLabel}>Sesiones clínicas</Text>
                      <Text style={styles.kpiValue}>
                        {seguimiento.totalSesionesCitas}
                      </Text>
                      <Text style={styles.kpiHint}>
                        {notas.length} notas documentadas
                      </Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiMiniCard}>
                      <Ionicons
                        name="flame"
                        size={20}
                        color={PALETTE.purpleVibrant}
                      />
                      <View>
                        <Text style={styles.kpiMiniVal}>
                          {seguimiento.rachaCalma} días
                        </Text>
                        <Text style={styles.kpiMiniLbl}>Racha de calma</Text>
                      </View>
                    </View>

                    <View style={styles.kpiMiniCard}>
                      <Ionicons
                        name="headset"
                        size={20}
                        color={PALETTE.tealDeep}
                      />
                      <View>
                        <Text style={styles.kpiMiniVal}>
                          {seguimiento.ejerciciosCompletados}
                        </Text>
                        <Text style={styles.kpiMiniLbl}>Ejercicios app</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <LinearGradient
                        colors={[PALETTE.lavenderSoft, "#E0E7FF"]}
                        style={styles.cardIconCircle}
                      >
                        <Ionicons
                          name="calendar"
                          size={18}
                          color={PALETTE.indigoMuted}
                        />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          Bitácora Emocional Reciente
                        </Text>
                        <Text style={styles.cardSub}>
                          Registros sincronizados desde Checking y Calendario
                        </Text>
                      </View>
                    </View>

                    {seguimiento.emociones.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons
                          name="heart-half-outline"
                          size={30}
                          color={PALETTE.indigoMuted}
                        />
                        <Text style={styles.emptyTitle}>
                          Sin registros emocionales recientes
                        </Text>
                        <Text style={styles.emptyDesc}>
                          Cuando el paciente registre su estado en Checking o
                          Calendario, aparecerá aquí automáticamente.
                        </Text>
                      </View>
                    ) : (
                      seguimiento.emociones.map((em, idx) => {
                        const nivel = Number(
                          em.nivelAnsiedad ??
                            em.intensidad ??
                            em.nivel ??
                            em.animo ??
                            0
                        );
                        return (
                          <View key={em.id || idx} style={styles.emotionRow}>
                            <View style={styles.emotionEmojiBubble}>
                              <Text style={{ fontSize: 18 }}>
                                {em.emoji ||
                                  (nivel >= 7 ? "😰" : nivel >= 4 ? "😐" : "🙂")}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.emotionTitle}>
                                {em.emocion || em.estado || "Registro diario"}
                              </Text>
                              {em.nota || em.comentario ? (
                                <Text
                                  style={styles.emotionNote}
                                  numberOfLines={2}
                                >
                                  "{em.nota || em.comentario}"
                                </Text>
                              ) : null}
                              <Text style={styles.emotionDate}>
                                {em.fecha || formatearFechaCorta(em.creadoEn)}
                              </Text>
                            </View>
                            {nivel > 0 && (
                              <View
                                style={[
                                  styles.levelPill,
                                  nivel >= 7
                                    ? { backgroundColor: "#FFE4E6" }
                                    : { backgroundColor: "#E0F2F1" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.levelPillText,
                                    nivel >= 7
                                      ? { color: "#BE123C" }
                                      : { color: PALETTE.tealDeep },
                                  ]}
                                >
                                  {nivel}/10
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              )}

              {/* PESTAÑA 2: HISTORIA CLÍNICA CON DESPLEGABLES Y CHIPS */}
              {tabActiva === "historia" && (
                <>
                  {/* Selector rápido de Formato A (Adulto) vs Formato B (Menor) */}
                  <View style={styles.formatSwitcherCard}>
                    <Text style={styles.formatSwitcherLabel}>
                      Tipo de Expediente Normativo:
                    </Text>
                    <View style={styles.twoColsRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setHistoria((p) => ({ ...p, tipoFormato: "adulto" }))
                        }
                        style={[
                          styles.formatBtn,
                          !esMenor && styles.formatBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.formatBtnText,
                            !esMenor && styles.formatBtnTextActive,
                          ]}
                        >
                          Formato A • Adulto (18+)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setHistoria((p) => ({ ...p, tipoFormato: "menor" }))
                        }
                        style={[
                          styles.formatBtn,
                          esMenor && styles.formatBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.formatBtnText,
                            esMenor && styles.formatBtnTextActive,
                          ]}
                        >
                          Formato B • Menor (&lt;18)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* DESPLEGABLE 1: FICHA DE IDENTIFICACIÓN */}
                  <AccordionSection
                    icon="id-card"
                    iconBg="#CCFBF1"
                    iconColor={PALETTE.tealDeep}
                    title="1. Ficha de Identificación"
                    subtitle="Datos generales, CURP y contacto de emergencia"
                    badgeText="NOM-004 5.2"
                    expanded={seccionesAbiertas.identificacion}
                    onToggle={() => toggleSeccion("identificacion")}
                  >
                    <View style={styles.twoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Edad</Text>
                        <TextInput
                          style={styles.inputSingle}
                          value={historia.edad}
                          onChangeText={actualizarEdadYFormato}
                          keyboardType="numeric"
                          placeholder="Ej. 21"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Fecha nacimiento</Text>
                        <TextInput
                          style={styles.inputSingle}
                          value={historia.fechaNacimiento}
                          onChangeText={(v) =>
                            setHistoria((p) => ({ ...p, fechaNacimiento: v }))
                          }
                          placeholder="DD/MM/AAAA"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        CURP (Identificador NOM-024 6.5.1)
                      </Text>
                      <TextInput
                        style={styles.inputSingle}
                        value={historia.curp}
                        autoCapitalize="characters"
                        maxLength={18}
                        onChangeText={(v) =>
                          setHistoria((p) => ({
                            ...p,
                            curp: v.toUpperCase(),
                          }))
                        }
                        placeholder="18 caracteres"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <ChipSelector
                      label="Sexo"
                      options={OPCIONES_SEXO}
                      value={historia.sexo}
                      onSelect={(v) => setHistoria((p) => ({ ...p, sexo: v }))}
                    />

                    {!esMenor && (
                      <ChipSelector
                        label="Estado civil"
                        options={OPCIONES_ESTADO_CIVIL}
                        value={historia.estadoCivil}
                        onSelect={(v) =>
                          setHistoria((p) => ({ ...p, estadoCivil: v }))
                        }
                      />
                    )}

                    <ChipSelector
                      label="Escolaridad"
                      options={OPCIONES_ESCOLARIDAD}
                      value={historia.escolaridad}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, escolaridad: v }))
                      }
                    />

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Ocupación actual</Text>
                      <TextInput
                        style={styles.inputSingle}
                        value={historia.ocupacion}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, ocupacion: v }))
                        }
                        placeholder="Estudiante / Empleada / Profesionista"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Domicilio del paciente (NOM-004 5.2.3)
                      </Text>
                      <TextInput
                        style={styles.inputSingle}
                        value={historia.domicilioPaciente}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, domicilioPaciente: v }))
                        }
                        placeholder="Ciudad, colonia o municipio"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    {/* SECCIÓN EXCLUSIVA FORMATO B (MENORES DE EDAD - LGDNNA) */}
                    {esMenor && (
                      <View style={styles.menorBox}>
                        <Text style={styles.menorBoxTitle}>
                          Representación Legal del Menor (LGDNNA)
                        </Text>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>
                            Nombre de Madre, Padre o Tutor *
                          </Text>
                          <TextInput
                            style={styles.inputSingle}
                            value={historia.nombreTutor}
                            onChangeText={(v) =>
                              setHistoria((p) => ({ ...p, nombreTutor: v }))
                            }
                            placeholder="Nombre completo del representante legal"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>

                        <View style={styles.twoColsRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Parentesco</Text>
                            <TextInput
                              style={styles.inputSingle}
                              value={historia.parentescoTutor}
                              onChangeText={(v) =>
                                setHistoria((p) => ({
                                  ...p,
                                  parentescoTutor: v,
                                }))
                              }
                              placeholder="Madre / Padre / Tutor"
                              placeholderTextColor="#94A3B8"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Tel. Tutor</Text>
                            <TextInput
                              style={styles.inputSingle}
                              value={historia.telefonoTutor}
                              keyboardType="phone-pad"
                              onChangeText={(v) =>
                                setHistoria((p) => ({ ...p, telefonoTutor: v }))
                              }
                              placeholder="228 000 0000"
                              placeholderTextColor="#94A3B8"
                            />
                          </View>
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>
                            Escuela y grado escolar
                          </Text>
                          <TextInput
                            style={styles.inputSingle}
                            value={historia.escuelaGrado}
                            onChangeText={(v) =>
                              setHistoria((p) => ({ ...p, escuelaGrado: v }))
                            }
                            placeholder="Ej. Secundaria Técnica #3, 2° grado"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.twoColsRow}>
                      <View style={{ flex: 1.3 }}>
                        <Text style={styles.fieldLabel}>
                          Contacto emergencia
                        </Text>
                        <TextInput
                          style={styles.inputSingle}
                          value={historia.contactoEmergencia}
                          onChangeText={(v) =>
                            setHistoria((p) => ({
                              ...p,
                              contactoEmergencia: v,
                            }))
                          }
                          placeholder="Nombre completo"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Parentesco</Text>
                        <TextInput
                          style={styles.inputSingle}
                          value={historia.parentescoEmergencia}
                          onChangeText={(v) =>
                            setHistoria((p) => ({
                              ...p,
                              parentescoEmergencia: v,
                            }))
                          }
                          placeholder="Madre / Pareja"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Teléfono de emergencia
                      </Text>
                      <TextInput
                        style={styles.inputSingle}
                        value={historia.telefonoEmergencia}
                        onChangeText={(v) =>
                          setHistoria((p) => ({
                            ...p,
                            telefonoEmergencia: v,
                          }))
                        }
                        keyboardType="phone-pad"
                        placeholder="Ej. 228 123 4567"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </AccordionSection>

                  {/* DESPLEGABLE 2: CONSENTIMIENTOS Y TELEPSICOLOGÍA */}
                  <AccordionSection
                    icon="shield-checkmark"
                    iconBg="#EDE9FE"
                    iconColor={PALETTE.purpleVibrant}
                    title="2. Consentimientos y Privacidad"
                    subtitle="LFPDPPP, atención a distancia y confidencialidad"
                    badgeText="LFPDPPP"
                    expanded={seccionesAbiertas.consentimientos}
                    onToggle={() => toggleSeccion("consentimientos")}
                  >
                    {[
                      {
                        key: "avisoPrivacidadEntregado",
                        titulo: "Aviso de Privacidad entregado",
                        desc: "Con finalidades y medios para ejercer derechos ARCO (LFPDPPP arts. 14-16).",
                      },
                      {
                        key: "consentimientoDatosSensibles",
                        titulo: "Consentimiento expreso de datos de salud",
                        desc: "Autorización expresa para tratamiento de datos clínicos sensibles (art. 8).",
                      },
                      {
                        key: "consentimientoInformado",
                        titulo: "Carta de Consentimiento Informado (NOM-004)",
                        desc: "Alcances, beneficios esperados y manejo de contingencias.",
                      },
                      {
                        key: "consentimientoTelepsicologia",
                        titulo: "Consentimiento para Atención a Distancia",
                        desc: "Entorno privado, política de no grabación y protocolo ante falla de red.",
                      },
                      {
                        key: "limitesConfidencialidadExplicados",
                        titulo: "Límites de confidencialidad explicados",
                        desc: "Excepciones legales ante riesgo grave o mandato judicial (NOM-004 5.6).",
                      },
                    ].map((item) => (
                      <View key={item.key} style={styles.consentBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.consentTitle}>{item.titulo}</Text>
                          <Text style={styles.consentDesc}>{item.desc}</Text>
                        </View>
                        <Switch
                          value={!!historia[item.key]}
                          onValueChange={(val) =>
                            setHistoria((p) => ({ ...p, [item.key]: val }))
                          }
                          trackColor={{
                            false: "#CBD5E1",
                            true: PALETTE.lavenderSoft,
                          }}
                          thumbColor={
                            historia[item.key]
                              ? PALETTE.purpleVibrant
                              : "#F8FAFC"
                          }
                        />
                      </View>
                    ))}

                    {esMenor && (
                      <View style={styles.consentBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.consentTitle}>
                            Asentimiento del menor (LGDNNA art. 2-II)
                          </Text>
                          <Text style={styles.consentDesc}>
                            Explicación adaptada a su edad y escucha de su
                            opinión.
                          </Text>
                        </View>
                        <Switch
                          value={!!historia.asentimientoMenor}
                          onValueChange={(val) =>
                            setHistoria((p) => ({
                              ...p,
                              asentimientoMenor: val,
                            }))
                          }
                          trackColor={{
                            false: "#CBD5E1",
                            true: PALETTE.lavenderSoft,
                          }}
                          thumbColor={
                            historia.asentimientoMenor
                              ? PALETTE.purpleVibrant
                              : "#F8FAFC"
                          }
                        />
                      </View>
                    )}
                  </AccordionSection>

                  {/* DESPLEGABLE 3: INTERROGATORIO CLÍNICO */}
                  <AccordionSection
                    icon="chatbubbles"
                    iconBg="#E0F2FE"
                    iconColor="#0284C7"
                    title="3. Interrogatorio y Antecedentes"
                    subtitle="Motivo de consulta, padecimiento e historial"
                    badgeText="NOM-004 6.1.1"
                    expanded={seccionesAbiertas.interrogatorio}
                    onToggle={() => toggleSeccion("interrogatorio")}
                  >
                    <ChipSelector
                      label="¿Quién refiere a consulta?"
                      options={[
                        "Iniciativa propia",
                        "Familiar / Pareja",
                        "Médico / Psiquiatra",
                        "Institución educativa",
                      ]}
                      value={historia.quienRefiere}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, quienRefiere: v }))
                      }
                    />

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Motivo de consulta (en palabras del paciente) *
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.motivoConsulta}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, motivoConsulta: v }))
                        }
                        placeholder="Describe el motivo principal por el que acude a terapia..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Padecimiento actual (inicio, curso y desencadenantes)
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.padecimientoActual}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, padecimientoActual: v }))
                        }
                        placeholder="¿Desde cuándo inició? ¿Cómo impacta en su vida diaria?"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Antecedentes heredofamiliares (salud mental familiar)
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.antecedentesHeredofamiliares}
                        onChangeText={(v) =>
                          setHistoria((p) => ({
                            ...p,
                            antecedentesHeredofamiliares: v,
                          }))
                        }
                        placeholder="Antecedentes médicos o psicológicos en familiares directos..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Antecedentes personales patológicos y tratamientos
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.antecedentesPatologicos}
                        onChangeText={(v) =>
                          setHistoria((p) => ({
                            ...p,
                            antecedentesPatologicos: v,
                          }))
                        }
                        placeholder="Enfermedades, medicamentos actuales, alergias o terapias previas..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <ChipSelector
                      label="Consumo de tabaco, alcohol o sustancias"
                      options={[
                        "Niega consumo de tabaco, alcohol u otras sustancias",
                        "Consumo social ocasional (alcohol/tabaco)",
                        "Consumo frecuente — requiere seguimiento",
                      ]}
                      value={historia.consumoSustancias}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, consumoSustancias: v }))
                      }
                    />

                    <ChipSelector
                      label="Antecedentes de violencia o trauma"
                      options={[
                        "Niega antecedentes de violencia o trauma agudo",
                        "Antecedente de violencia / trauma en elaboración",
                        "Situación de riesgo actual (activar protocolo)",
                      ]}
                      value={historia.antecedentesViolenciaTrauma}
                      onSelect={(v) =>
                        setHistoria((p) => ({
                          ...p,
                          antecedentesViolenciaTrauma: v,
                        }))
                      }
                    />
                  </AccordionSection>

                  {/* DESPLEGABLE 4: EVALUACIÓN DE RIESGO Y EXAMEN MENTAL */}
                  <AccordionSection
                    icon="pulse"
                    iconBg="#FEE2E2"
                    iconColor="#DC2626"
                    title="4. Riesgo y Examen Mental"
                    subtitle="Selección rápida de estado mental y factores de riesgo"
                    badgeText="NOM-004 6.1.2"
                    expanded={seccionesAbiertas.riesgoMental}
                    onToggle={() => toggleSeccion("riesgoMental")}
                  >
                    <ChipSelector
                      label="Evaluación de riesgo suicida / autolesión"
                      options={OPCIONES_RIESGO}
                      value={historia.nivelRiesgoSuicida}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, nivelRiesgoSuicida: v }))
                      }
                    />

                    <ChipSelector
                      label="Apariencia y conducta"
                      options={OPCIONES_ESTADO_MENTAL.apariencia}
                      value={historia.emApariencia}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, emApariencia: v }))
                      }
                    />

                    <ChipSelector
                      label="Lenguaje"
                      options={OPCIONES_ESTADO_MENTAL.lenguaje}
                      value={historia.emLenguaje}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, emLenguaje: v }))
                      }
                    />

                    <ChipSelector
                      label="Afecto y estado de ánimo"
                      options={OPCIONES_ESTADO_MENTAL.afecto}
                      value={historia.emAfecto}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, emAfecto: v }))
                      }
                    />

                    <ChipSelector
                      label="Orientación"
                      options={OPCIONES_ESTADO_MENTAL.orientacion}
                      value={historia.emOrientacion}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, emOrientacion: v }))
                      }
                    />

                    <ChipSelector
                      label="Juicio e introspección"
                      options={OPCIONES_ESTADO_MENTAL.juicio}
                      value={historia.emJuicio}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, emJuicio: v }))
                      }
                    />

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Observaciones clínicas adicionales del examen mental
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.examenMentalNotas}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, examenMentalNotas: v }))
                        }
                        placeholder="Memoria, atención, sensopercepción o factores protectores..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </AccordionSection>

                  {/* DESPLEGABLE 5: DIAGNÓSTICO CIE-11, PRONÓSTICO Y PLAN */}
                  <AccordionSection
                    icon="document-text"
                    iconBg="#EDE9FE"
                    iconColor={PALETTE.purpleVibrant}
                    title="5. Diagnóstico (CIE-11) y Plan"
                    subtitle="Catálogo CIE vigente, pronóstico y tratamiento"
                    badgeText="NOM-024 6.4.2"
                    expanded={seccionesAbiertas.diagnosticoPlan}
                    onToggle={() => toggleSeccion("diagnosticoPlan")}
                  >
                    <View style={styles.fieldGroup}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={styles.fieldLabel}>
                          Impresión diagnóstica (CIE-11)
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setMostrarCatalogoCIE(!mostrarCatalogoCIE)
                          }
                          style={styles.cieToggleBtn}
                        >
                          <Ionicons
                            name="list"
                            size={14}
                            color={PALETTE.purpleVibrant}
                          />
                          <Text style={styles.cieToggleText}>
                            {mostrarCatalogoCIE
                              ? "Cerrar catálogo"
                              : "Elegir código CIE-11"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {mostrarCatalogoCIE && (
                        <View style={styles.cieDropdownBox}>
                          {CATALOGO_CIE11.map((cod) => (
                            <TouchableOpacity
                              key={cod}
                              onPress={() => {
                                setHistoria((p) => ({
                                  ...p,
                                  impresionDiagnostica: cod,
                                }));
                                setMostrarCatalogoCIE(false);
                              }}
                              style={styles.cieOptionItem}
                            >
                              <Text style={styles.cieOptionText}>{cod}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <TextInput
                        style={styles.inputSingle}
                        value={historia.impresionDiagnostica}
                        onChangeText={(v) =>
                          setHistoria((p) => ({
                            ...p,
                            impresionDiagnostica: v,
                          }))
                        }
                        onFocus={() =>
                          setTimeout(
                            () =>
                              scrollDetalleRef.current?.scrollToEnd({
                                animated: true,
                              }),
                            180
                          )
                        }
                        placeholder="Selecciona arriba o escribe el código CIE-11..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <ChipSelector
                      label="Pronóstico (NOM-004 6.1.5)"
                      options={OPCIONES_PRONOSTICO}
                      value={historia.pronostico}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, pronostico: v }))
                      }
                    />

                    <ChipSelector
                      label="Enfoque terapéutico"
                      options={OPCIONES_ENFOQUE}
                      value={historia.enfoqueTerapeutico}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, enfoqueTerapeutico: v }))
                      }
                    />

                    <ChipSelector
                      label="Frecuencia de sesiones"
                      options={OPCIONES_FRECUENCIA}
                      value={historia.frecuenciaSesiones}
                      onSelect={(v) =>
                        setHistoria((p) => ({ ...p, frecuenciaSesiones: v }))
                      }
                    />

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Objetivos terapéuticos e indicaciones
                      </Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        value={historia.planTerapeutico}
                        onChangeText={(v) =>
                          setHistoria((p) => ({ ...p, planTerapeutico: v }))
                        }
                        onFocus={() =>
                          setTimeout(
                            () =>
                              scrollDetalleRef.current?.scrollToEnd({
                                animated: true,
                              }),
                            180
                          )
                        }
                        placeholder="Objetivos medibles a corto y mediano plazo..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </AccordionSection>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleGuardarHistoria}
                    disabled={guardandoHistoria}
                  >
                    <LinearGradient
                      colors={[
                        PALETTE.indigoMuted,
                        PALETTE.purpleVibrant,
                        PALETTE.tealDeep,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryGradBtn}
                    >
                      {guardandoHistoria ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={styles.primaryGradBtnText}>
                            Guardar Historia Clínica
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* PESTAÑA 3: NOTAS DE EVOLUCIÓN (SOAP) */}
              {tabActiva === "notas" && (
                <>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setModalNuevaNota(true)}
                  >
                    <LinearGradient
                      colors={[PALETTE.tealDeep, PALETTE.purpleVibrant]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryGradBtn}
                    >
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryGradBtnText}>
                        Nueva Nota de Evolución (SOAP)
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {notas.length === 0 ? (
                    <View
                      style={[
                        styles.card,
                        { alignItems: "center", paddingVertical: 30 },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={36}
                        color={PALETTE.indigoMuted}
                      />
                      <Text style={styles.emptyTitle}>
                        Sin notas de sesión registradas
                      </Text>
                      <Text style={styles.emptyDesc}>
                        Documenta cada consulta con estructura SOAP (inalterable
                        conforme a NOM-024) para mantener el historial clínico
                        completo.
                      </Text>
                    </View>
                  ) : (
                    notas.map((n, idx) => (
                      <View key={n.id || idx} style={styles.notaCard}>
                        <View style={styles.notaTopRow}>
                          <View style={styles.notaSesionPill}>
                            <Text style={styles.notaSesionPillText}>
                              SESIÓN #{n.numeroSesion || notas.length - idx}
                            </Text>
                          </View>
                          <Text style={styles.notaFechaText}>
                            {n.fechaTexto} • {n.modalidad || "Presencial"}
                          </Text>
                        </View>

                        {n.verificacionVirtual ? (
                          <View style={styles.virtualBadgeRow}>
                            <Ionicons
                              name="videocam-outline"
                              size={13}
                              color={PALETTE.indigoMuted}
                            />
                            <Text style={styles.virtualBadgeText}>
                              {n.verificacionVirtual}
                            </Text>
                          </View>
                        ) : null}

                        {n.subjetivo ? (
                          <View style={styles.soapBlock}>
                            <Text style={styles.soapTag}>S • Subjetivo</Text>
                            <Text style={styles.soapText}>{n.subjetivo}</Text>
                          </View>
                        ) : null}

                        {n.objetivo ? (
                          <View style={styles.soapBlock}>
                            <Text style={styles.soapTag}>O • Objetivo</Text>
                            <Text style={styles.soapText}>{n.objetivo}</Text>
                          </View>
                        ) : null}

                        {n.analisis ? (
                          <View style={styles.soapBlock}>
                            <Text style={styles.soapTag}>
                              A • Análisis / Intervención
                            </Text>
                            <Text style={styles.soapText}>{n.analisis}</Text>
                          </View>
                        ) : null}

                        {n.plan ? (
                          <View style={styles.soapBlock}>
                            <Text style={styles.soapTag}>P • Plan / Tareas</Text>
                            <Text style={styles.soapText}>{n.plan}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* MODAL NUEVA NOTA SOAP */}
        <Modal
          visible={modalNuevaNota}
          transparent
          animationType="slide"
          onRequestClose={() => setModalNuevaNota(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalBottomOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.notaModalCard}>
              <View style={styles.notaModalHeader}>
                <View>
                  <Text style={styles.notaModalTitle}>
                    Nota de Evolución Clínico-SOAP
                  </Text>
                  <Text style={styles.notaModalSub}>
                    Paciente: {pacienteActivo.nombre} • NOM-004 6.2
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalNuevaNota(false);
                  }}
                  style={styles.closeModalCircle}
                >
                  <Ionicons name="close" size={20} color={PALETTE.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={scrollModalNotaRef}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 12,
                  paddingBottom: tecladoAltura > 0 ? tecladoAltura + 40 : 30,
                }}
              >
                <View style={styles.twoColsRow}>
                  {["Presencial", "En línea"].map((mod) => (
                    <TouchableOpacity
                      key={mod}
                      onPress={() =>
                        setNotaForm((p) => ({ ...p, modalidad: mod }))
                      }
                      style={[
                        styles.modChoiceBtn,
                        notaForm.modalidad === mod && styles.modChoiceBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modChoiceText,
                          notaForm.modalidad === mod &&
                            styles.modChoiceTextActive,
                        ]}
                      >
                        {mod}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {notaForm.modalidad === "En línea" && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      Verificación de telepsicología (ubicación y privacidad)
                    </Text>
                    <TextInput
                      style={styles.inputSingle}
                      value={notaForm.verificacionVirtual}
                      onChangeText={(v) =>
                        setNotaForm((p) => ({ ...p, verificacionVirtual: v }))
                      }
                      placeholder="Identidad verificada, ubicación y sin fallas técnicas"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    S — Subjetivo (Lo que reporta el paciente)
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    value={notaForm.subjetivo}
                    onChangeText={(v) =>
                      setNotaForm((p) => ({ ...p, subjetivo: v }))
                    }
                    placeholder="Estado emocional referido, eventos relevantes de la semana..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    O — Objetivo (Observación clínica y métricas)
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    value={notaForm.objetivo}
                    onChangeText={(v) =>
                      setNotaForm((p) => ({ ...p, objetivo: v }))
                    }
                    placeholder="Afecto observado, lenguaje, adherencia a ejercicios en app..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    A — Análisis e intervención terapéutica
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    value={notaForm.analisis}
                    onChangeText={(v) =>
                      setNotaForm((p) => ({ ...p, analisis: v }))
                    }
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollModalNotaRef.current?.scrollToEnd({
                            animated: true,
                          }),
                        180
                      )
                    }
                    placeholder="Técnicas aplicadas en consulta y evolución observada..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <ChipSelector
                  label="Actualización del riesgo en sesión"
                  options={[
                    "Sin cambios (Sin riesgo aparente)",
                    "Riesgo leve en monitoreo",
                    "Se activó plan de seguridad",
                  ]}
                  value={notaForm.actualizacionRiesgo}
                  onSelect={(v) =>
                    setNotaForm((p) => ({ ...p, actualizacionRiesgo: v }))
                  }
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    P — Plan y tareas para casa
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    value={notaForm.plan}
                    onChangeText={(v) =>
                      setNotaForm((p) => ({ ...p, plan: v }))
                    }
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollModalNotaRef.current?.scrollToEnd({
                            animated: true,
                          }),
                        180
                      )
                    }
                    placeholder="Ejercicios asignados en Lami y próxima sesión..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={guardandoNota}
                  onPress={handleAgregarNota}
                >
                  <LinearGradient
                    colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradBtn}
                  >
                    <Text style={styles.primaryGradBtnText}>
                      {guardandoNota
                        ? "Guardando nota..."
                        : "Guardar Nota en Expediente"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL DE CONFIRMACIÓN */}
        <Modal
          visible={modalConfirmacion.visible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setModalConfirmacion((p) => ({ ...p, visible: false }))
          }
        >
          <View style={styles.modalCenterOverlay}>
            <View style={styles.confirmCard}>
              <LinearGradient
                colors={[PALETTE.tealDeep, PALETTE.purpleVibrant]}
                style={styles.confirmIconCircle}
              >
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.confirmTitle}>
                {modalConfirmacion.titulo}
              </Text>
              <Text style={styles.confirmBody}>
                {modalConfirmacion.mensaje}
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setModalConfirmacion((p) => ({ ...p, visible: false }))
                }
                style={{ width: "100%", marginTop: 16 }}
              >
                <LinearGradient
                  colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VISTA 1: PESTAÑA PRINCIPAL DE EXPEDIENTES
  // =========================================================================
  return (
    <SafeAreaView style={styles.mainSafeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeaderBar}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="folder-open" size={20} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.screenMainTitle}>Expedientes</Text>
              <View style={styles.codeTag}>
                <Text style={styles.codeTagText}>
                  {psicologoInfo.codigoVinculacion}
                </Text>
              </View>
            </View>
            <Text style={styles.screenMainSub}>
              Céd. {psicologoInfo.cedulaProfesional} • NOM-004-SSA3-2012
            </Text>
          </View>

          <TouchableOpacity
            onPress={cargarDatosIniciales}
            style={styles.refreshBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={PALETTE.tealDeep} />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[PALETTE.tealDeep, PALETTE.indigoMuted, PALETTE.purpleVibrant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>ARCHIVO CLÍNICO DIGITAL</Text>
            <Text style={styles.heroTitle}>
              {pacientes.length}{" "}
              {pacientes.length === 1
                ? "Paciente vinculado"
                : "Pacientes vinculados"}
            </Text>
            <Text style={styles.heroSub}>
              {completosCount} con historia activa • {pendientesCount} por
              aperturar
            </Text>
          </View>
          <View style={styles.heroBadgeIcon}>
            <Ionicons name="document-text" size={26} color="#FFFFFF" />
          </View>
        </LinearGradient>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar paciente por nombre..."
            placeholderTextColor="#94A3B8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda !== "" && (
            <TouchableOpacity onPress={() => setBusqueda("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterChipsRow}>
          {[
            { id: "todos", label: `Todos (${pacientes.length})` },
            { id: "completos", label: `Activos (${completosCount})` },
            { id: "pendientes", label: `Pendientes (${pendientesCount})` },
          ].map((chip) => {
            const activo = filtroEstado === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setFiltroEstado(chip.id)}
                style={[styles.filterChip, activo && styles.filterChipActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activo && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {cargandoLista ? (
          <View style={styles.listLoadingBox}>
            <ActivityIndicator size="large" color={PALETTE.purpleVibrant} />
            <Text style={styles.loadingText}>Cargando expedientes...</Text>
          </View>
        ) : pacientesFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="folder-open-outline"
              size={40}
              color={PALETTE.indigoMuted}
            />
            <Text style={styles.emptyTitle}>
              No hay expedientes para mostrar
            </Text>
            <Text style={styles.emptyDesc}>
              Cuando tus pacientes se vinculen con tu código (
              {psicologoInfo.codigoVinculacion}), aparecerán aquí para abrir su
              expediente y exportar su PDF.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {pacientesFiltrados.map((pac) => (
              <TouchableOpacity
                key={pac.id}
                activeOpacity={0.88}
                onPress={() => abrirExpedientePaciente(pac)}
                style={styles.patientCard}
              >
                {pac.fotoPerfil ? (
                  <Image
                    source={{ uri: pac.fotoPerfil }}
                    style={styles.patientAvatar}
                  />
                ) : (
                  <LinearGradient
                    colors={[PALETTE.lavenderSoft, PALETTE.tealMid]}
                    style={styles.patientAvatarFallback}
                  >
                    <Text style={styles.patientInitials}>
                      {pac.nombre.slice(0, 2).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}

                <View style={{ flex: 1 }}>
                  <View style={styles.patientTopLine}>
                    <Text style={styles.patientFolio}>{pac.folio}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        pac.tieneExpediente
                          ? styles.statusPillOk
                          : styles.statusPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          pac.tieneExpediente
                            ? styles.statusPillTextOk
                            : styles.statusPillTextPending,
                        ]}
                      >
                        {pac.tieneExpediente
                          ? "Historia activa"
                          : "Apertura pendiente"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.patientName} numberOfLines={1}>
                    {pac.nombre}
                  </Text>
                  <Text style={styles.patientSub} numberOfLines={1}>
                    {pac.diagnostico
                      ? `Dx: ${pac.diagnostico}`
                      : "Seguimiento digital, notas SOAP y PDF"}
                  </Text>
                </View>

                <View style={styles.openArrowBox}>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={PALETTE.indigoMuted}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainSafeArea: {
    flex: 1,
    backgroundColor: PALETTE.bgCanvas,
  },
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.indigoMuted,
  },
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 14,
  },

  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PALETTE.tealDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  screenMainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  codeTag: {
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.tealDeep,
  },
  screenMainSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  heroBanner: {
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: PALETTE.indigoMuted,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 3,
  },
  heroBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: PALETTE.textDark,
  },

  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: PALETTE.tealDeep,
    borderColor: PALETTE.tealDeep,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  listLoadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EBE7FE",
    gap: 6,
  },

  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EBE7FE",
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: PALETTE.lavenderSoft,
  },
  patientAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  patientInitials: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  patientTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  patientFolio: {
    fontSize: 10.5,
    fontWeight: "800",
    color: PALETTE.indigoMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusPillOk: {
    backgroundColor: "#E0F2F1",
  },
  statusPillPending: {
    backgroundColor: "#FEF3C7",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillTextOk: {
    color: PALETTE.tealDeep,
  },
  statusPillTextPending: {
    color: "#B45309",
  },
  patientName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginTop: 2,
  },
  patientSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  openArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PALETTE.bgCanvas,
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  detailHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 14,
  },
  detailHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.8,
  },
  detailTitle: {
    fontSize: 17.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pdfHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pdfHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.indigoMuted,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  tabPillActive: {
    backgroundColor: "#FFFFFF",
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabPillTextActive: {
    color: PALETTE.indigoMuted,
  },

  scrollContent: {
    padding: 16,
    gap: 12,
  },

  kpiGrid: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E4FA",
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "900",
    color: PALETTE.textDark,
    marginTop: 4,
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  kpiHint: {
    fontSize: 11,
    color: PALETTE.indigoMuted,
    marginTop: 4,
    fontWeight: "600",
  },
  kpiMiniCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EBE7FE",
  },
  kpiMiniVal: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  kpiMiniLbl: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F1FC",
  },
  emotionEmojiBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emotionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  emotionNote: {
    fontSize: 12,
    color: PALETTE.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  emotionDate: {
    fontSize: 11,
    color: PALETTE.indigoMuted,
    marginTop: 2,
  },
  levelPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  levelPillText: {
    fontSize: 11.5,
    fontWeight: "800",
  },

  // FORMATO A / B SWITCHER
  formatSwitcherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EBE7FE",
    gap: 8,
  },
  formatSwitcherLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  formatBtnActive: {
    backgroundColor: "#EEF2FF",
    borderColor: PALETTE.indigoMuted,
  },
  formatBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  formatBtnTextActive: {
    color: PALETTE.textDark,
    fontWeight: "800",
  },

  // ACORDEONES Y CHIPS
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EBE7FE",
    gap: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accordionBody: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  normaBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  normaBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  cardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  cardSub: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  choiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  choiceChipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: PALETTE.purpleVibrant,
  },
  choiceChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  choiceChipTextSelected: {
    color: PALETTE.textDark,
    fontWeight: "800",
  },
  menorBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },
  menorBoxTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#92400E",
  },
  cieToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cieToggleText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  cieDropdownBox: {
    backgroundColor: "#FAF9FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
    overflow: "hidden",
  },
  cieOptionItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
  },
  cieOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textDark,
  },

  twoColsRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.indigoMuted,
  },
  inputSingle: {
    borderWidth: 1,
    borderColor: "#E2E0F5",
    backgroundColor: "#FAF9FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    color: PALETTE.textDark,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E2E0F5",
    backgroundColor: "#FAF9FF",
    borderRadius: 14,
    padding: 12,
    minHeight: 74,
    fontSize: 13.5,
    textAlignVertical: "top",
    color: PALETTE.textDark,
  },
  consentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F4F2FF",
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
  },
  consentTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  consentDesc: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  primaryGradBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
  },
  primaryGradBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  notaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EBE7FE",
    gap: 10,
  },
  notaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notaSesionPill: {
    backgroundColor: "#EFE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  notaSesionPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  notaFechaText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  virtualBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  virtualBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: PALETTE.indigoMuted,
    flex: 1,
  },
  soapBlock: {
    backgroundColor: "#FAF9FF",
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.tealDeep,
  },
  soapTag: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.tealDeep,
    marginBottom: 2,
  },
  soapText: {
    fontSize: 13,
    color: PALETTE.textDark,
    lineHeight: 18,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginTop: 6,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 14,
  },
  modalBottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.55)",
    justifyContent: "flex-end",
  },
  notaModalCard: {
    height: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  notaModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  notaModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  notaModalSub: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
  },
  closeModalCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modChoiceBtnActive: {
    backgroundColor: PALETTE.tealDeep,
  },
  modChoiceText: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  modChoiceTextActive: {
    color: "#FFFFFF",
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PALETTE.lavenderSoft,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: PALETTE.textDark,
    textAlign: "center",
  },
  confirmBody: {
    fontSize: 13,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});