import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/firebaseConfig";
import {
  eliminarEjercicioAsignado,
  enviarEjercicioAPaciente,
  escucharMisPacientes,
  escucharTareasDelPsicologo,
} from "../../services/lamiSyncService";

const ENFOQUES = ["Terapia", "Regulación", "Activación"];

const FRECUENCIAS = [
  { tipo: "unica", horas: null, label: "Única vez (1 sesión)" },
  { tipo: "recurrente", horas: 8, label: "Cada 8 horas" },
  { tipo: "recurrente", horas: 12, label: "Cada 12 horas" },
  { tipo: "recurrente", horas: 24, label: "Diario (Cada 24h)" },
  { tipo: "recurrente", horas: 72, label: "Cada 3 días" },
  { tipo: "recurrente", horas: 168, label: "Semanal (Cada 7 días)" },
];

const TIPOS_PASO = [
  { key: "pregunta", label: "Pregunta abierta" },
  { key: "escala", label: "Escala (1-10)" },
  { key: "instruccion", label: "Indicación / Acción" },
];

const EJERCICIOS_PREESCRITOS = [
  {
    id: "abcde",
    habilitadoEnvio: true,
    imagen: require("../../assets/autoabrazo.jpg"),
    caso: "Pensamientos automáticos y catastrofismo",
    estadoModulo: "Listo para enviar",
    titulo: "Técnica cognitiva ABCDE",
    enfoque: "Terapia",
    frecuenciaLabel: "Diario (Cada 24h)",
    queHace:
      "Guía al paciente a detectar la situación (A), su pensamiento automático (B) y reacción (C), cuestionarlo con evidencia (D) y formular una alternativa equilibrada (E).",
    descripcion:
      "Identifica la situación (A), el pensamiento automático (B) y la emoción (C), debátelo con evidencia (D) y construye una nueva perspectiva (E).",
    pasos: [
      {
        tipo: "pregunta",
        label:
          "¿Cuál fue la situación detonante (A) y qué pensamiento automático apareció (B)?",
      },
      {
        tipo: "pregunta",
        label:
          "¿Qué evidencia real respalda o cuestiona ese pensamiento (D) y qué conclusión más equilibrada puedes formular (E)?",
      },
      {
        tipo: "escala",
        label: "Del 1 al 10, ¿qué intensidad tiene tu malestar tras el debate?",
      },
    ],
  },
  {
    id: "respiracion-478",
    habilitadoEnvio: true,
    imagen: require("../../assets/respracion.gif"),
    caso: "Ansiedad aguda y aceleración",
    estadoModulo: "Listo para enviar",
    titulo: "Respiración 4-7-8",
    enfoque: "Regulación",
    frecuenciaLabel: "Cada 12 horas",
    queHace:
      "Marca un ritmo de inhalación en 4 segundos, retención en 7 segundos y exhalación lenta en 8 segundos para desacelerar la respuesta de alerta.",
    descripcion:
      "Inhala en 4 segundos, sostén el aire 7 segundos y exhala lento en 8 segundos durante 4 ciclos para regular el sistema nervioso.",
    pasos: [
      {
        tipo: "instruccion",
        label:
          "Completa 4 ciclos de inhalación (4s), pausa (7s) y exhalación lenta (8s).",
      },
      {
        tipo: "escala",
        label:
          "Del 1 al 10, ¿qué nivel de tensión corporal sientes al terminar?",
      },
    ],
  },
  {
    id: "escaneo-corporal",
    habilitadoEnvio: true,
    imagen: require("../../assets/corporal.png"),
    caso: "Tensión física y desconexión del cuerpo",
    estadoModulo: "Listo para enviar",
    titulo: "Escaneo corporal",
    enfoque: "Regulación",
    frecuenciaLabel: "Diario (Cada 24h)",
    queHace:
      "Acompaña a recorrer el cuerpo desde la cabeza hasta los pies para ubicar zonas de rigidez o carga física y soltar tensión de forma gradual.",
    descripcion:
      "Recorre con atención desde la cabeza hasta los pies para localizar zonas de rigidez o carga física sin juzgarlas.",
    pasos: [
      {
        tipo: "instruccion",
        label:
          "Observa con calma mandíbula, hombros, pecho, abdomen y piernas durante unos minutos.",
      },
      {
        tipo: "pregunta",
        label:
          "¿En qué parte del cuerpo notaste mayor tensión y qué cambió al soltarla?",
      },
    ],
  },
  {
    id: "anclaje-sentidos",
    habilitadoEnvio: true,
    imagen: require("../../assets/sentidos.jpg"),
    caso: "Sobrecarga mental o sensación de irrealidad",
    estadoModulo: "Listo para enviar",
    titulo: "Anclaje con los sentidos",
    enfoque: "Activación",
    frecuenciaLabel: "Única vez (1 sesión)",
    queHace:
      "Ayuda a centrar la atención en el aquí y el ahora mediante la observación de estímulos visuales, táctiles, auditivos, olfativos y del gusto.",
    descripcion:
      "Conecta con el entorno presente identificando estímulos visuales, táctiles, auditivos, olfativos y de sabor.",
    pasos: [
      {
        tipo: "instruccion",
        label:
          "Nombra 5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles y 1 que saboreas.",
      },
      {
        tipo: "pregunta",
        label:
          "¿Qué elemento del entorno te ayudó a sentirte más presente hoy?",
      },
    ],
  },
  {
    id: "registro-disparadores",
    habilitadoEnvio: false,
    imagen: require("../../assets/ansiedad.jpg"),
    caso: "Seguimiento de detonantes cotidianos",
    estadoModulo: "Aún no disponible (módulo pendiente)",
    titulo: "Mapa de detonantes y señales",
    enfoque: "Terapia",
    frecuenciaLabel: "Diario (Cada 24h)",
    queHace:
      "Permite registrar qué situaciones, horarios o conversaciones disparan el malestar y qué señales tempranas aparecen antes de que escale.",
    descripcion:
      "Registra qué contextos, horarios o conversaciones suelen activar tu malestar para anticipar apoyos en sesión.",
    pasos: [
      {
        tipo: "pregunta",
        label:
          "¿Qué detonante o contexto apareció hoy y qué señal temprana notaste?",
      },
      {
        tipo: "escala",
        label: "Del 1 al 10, ¿qué tan intenso fue el detonante?",
      },
    ],
  },
  {
    id: "plan-calma-crisis",
    habilitadoEnvio: false,
    imagen: require("../../assets/escaneo.jpg"),
    caso: "Prevención y manejo de momentos difíciles",
    estadoModulo: "Aún no disponible (módulo pendiente)",
    titulo: "Plan de calma para momentos difíciles",
    enfoque: "Activación",
    frecuenciaLabel: "Semanal (Cada 7 días)",
    queHace:
      "Estructura acciones breves de contención y pasos previos para cuando el paciente atraviesa picos emocionales o momentos de alta demanda.",
    descripcion:
      "Prepara con anticipación pasos concretos, personas de apoyo y frases de cuidado para cuando suba la ansiedad.",
    pasos: [
      {
        tipo: "instruccion",
        label:
          "Elige 2 acciones breves de cuidado que puedas hacer en menos de 5 minutos.",
      },
      {
        tipo: "pregunta",
        label:
          "¿A quién o qué recurso acudirás primero si sientes que el malestar sube?",
      },
    ],
  },
];

function formatearFechaHora(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AvatarPaciente({ paciente, size = 34 }) {
  if (paciente?.fotoPerfil) {
    return (
      <Image
        source={{ uri: paciente.fotoPerfil }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#EDE9FE",
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#EDE9FE",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="person" size={Math.round(size * 0.56)} color="#5B21B6" />
    </View>
  );
}

export default function EjerciciosPsicologo({ route, navigation }) {
  const pacienteInicial = route?.params?.paciente || null;
  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";

  const [pacientes, setPacientes] = useState([]);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState(pacienteInicial);

  const [tabActiva, setTabActiva] = useState("ejercicios");

  const [plantillaActivaId, setPlantillaActivaId] = useState(null);
  const [tituloEjercicio, setTituloEjercicio] = useState("");
  const [enfoqueEjercicio, setEnfoqueEjercicio] = useState(ENFOQUES[0]);
  const [descripcionEjercicio, setDescripcionEjercicio] = useState("");
  const [frecuenciaEjercicio, setFrecuenciaEjercicio] = useState(
    FRECUENCIAS[3],
  );

  const [tituloPregunta, setTituloPregunta] = useState("");
  const [frecuenciaPregunta, setFrecuenciaPregunta] = useState(FRECUENCIAS[3]);
  const [pasosPregunta, setPasosPregunta] = useState([
    {
      tipo: "pregunta",
      label: "¿Cómo te sentiste hoy y qué pensamiento llamó tu atención?",
    },
  ]);

  const [guardando, setGuardando] = useState(false);

  const [editandoTareaId, setEditandoTareaId] = useState(null);
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editFrecuenciaSel, setEditFrecuenciaSel] = useState(FRECUENCIAS[3]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [ejerciciosPaciente, setEjerciciosPaciente] = useState([]);
  const [expandedTareaId, setExpandedTareaId] = useState(null);

  // Modal con diseño para confirmaciones y avisos
  const [modalAviso, setModalAviso] = useState({
    visible: false,
    tipo: "exito", // "exito" | "aviso" | "confirmar_cancelar"
    badge: "ENVÍO CONFIRMADO",
    titulo: "",
    mensaje: "",
    irAEnviados: false,
    tareaPendienteCancelar: null,
  });

  const abrirModalAviso = ({
    tipo = "exito",
    badge = "ENVÍO CONFIRMADO",
    titulo = "",
    mensaje = "",
    irAEnviados = false,
    tareaPendienteCancelar = null,
  }) => {
    setModalAviso({
      visible: true,
      tipo,
      badge,
      titulo,
      mensaje,
      irAEnviados,
      tareaPendienteCancelar,
    });
  };

  const cerrarModalAviso = () => {
    const debeIr = modalAviso.irAEnviados;
    setModalAviso((prev) => ({
      ...prev,
      visible: false,
      irAEnviados: false,
      tareaPendienteCancelar: null,
    }));
    if (debeIr) {
      setTabActiva("enviados");
    }
  };

  useEffect(() => {
    const unsub = escucharMisPacientes(psicologoId, (lista) => {
      setPacientes(lista || []);
      if (!pacienteSeleccionado && lista && lista.length > 0) {
        setPacienteSeleccionado(lista[0]);
      }
    });
    return () => unsub && unsub();
  }, [psicologoId]);

  useEffect(() => {
    if (!pacienteSeleccionado?.uid) {
      setEjerciciosPaciente([]);
      return;
    }
    const unsubTareas = escucharTareasDelPsicologo(
      pacienteSeleccionado.uid,
      (lista) => {
        setEjerciciosPaciente(lista || []);
      },
    );
    return () => unsubTareas && unsubTareas();
  }, [pacienteSeleccionado?.uid]);

  const terminoBusqueda = busquedaPaciente.trim().toLowerCase();
  const pacientesFiltrados = pacientes.filter((p) => {
    if (!terminoBusqueda) return true;
    const nombre = String(p.nombre || "").toLowerCase();
    const correo = String(p.correo || "").toLowerCase();
    return nombre.includes(terminoBusqueda) || correo.includes(terminoBusqueda);
  });

  const buscarTareaAsignadaDePlantilla = (preset) => {
    return ejerciciosPaciente.find(
      (t) =>
        t.plantillaId === preset.id ||
        String(t.titulo || "")
          .trim()
          .toLowerCase() ===
          String(preset.titulo || "")
            .trim()
            .toLowerCase(),
    );
  };

  const cargarEjercicioParaEditar = (preset) => {
    if (!preset.habilitadoEnvio) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "MÓDULO PENDIENTE",
        titulo: "Ejercicio aún no disponible",
        mensaje:
          "Este ejercicio aún no está habilitado para envío hasta que terminemos su módulo.",
      });
      return;
    }
    setPlantillaActivaId(preset.id);
    setTituloEjercicio(preset.titulo);
    setEnfoqueEjercicio(
      ENFOQUES.includes(preset.enfoque) ? preset.enfoque : ENFOQUES[0],
    );
    setDescripcionEjercicio(preset.descripcion);

    const freqEncontrada = FRECUENCIAS.find(
      (f) => f.label === preset.frecuenciaLabel,
    );
    if (freqEncontrada) {
      setFrecuenciaEjercicio(freqEncontrada);
    }
  };

  const enviarEjercicioDirecto = async (preset) => {
    if (!preset.habilitadoEnvio) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "MÓDULO PENDIENTE",
        titulo: "Ejercicio aún no disponible",
        mensaje:
          "Este ejercicio aún no puede enviarse; se habilitará cuando terminemos ese módulo.",
      });
      return;
    }

    if (!pacienteSeleccionado?.uid) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "PACIENTE REQUERIDO",
        titulo: "Selecciona un paciente",
        mensaje:
          "Elige primero a qué paciente vinculado deseas enviar este ejercicio.",
      });
      return;
    }

    if (buscarTareaAsignadaDePlantilla(preset)) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "YA ENVIADO",
        titulo: "Ejercicio ya enviado",
        mensaje: `Este ejercicio ya fue enviado a ${
          pacienteSeleccionado.nombre || "este paciente"
        }. Puedes modificar su frecuencia e instrucciones o cancelarlo en Enviados.`,
      });
      return;
    }

    const freqEncontrada =
      FRECUENCIAS.find((f) => f.label === preset.frecuenciaLabel) ||
      FRECUENCIAS[3];

    try {
      setGuardando(true);
      setPlantillaActivaId(preset.id);
      await enviarEjercicioAPaciente(pacienteSeleccionado.uid, psicologoId, {
        titulo: preset.titulo,
        enfoque: preset.enfoque,
        categoriaEnvio: "ejercicio",
        descripcion: preset.descripcion,
        frecuenciaTipo: freqEncontrada.tipo,
        intervaloHoras: freqEncontrada.horas,
        frecuenciaLabel: freqEncontrada.label,
        plantillaId: preset.id,
        pasos: preset.pasos.map((p) => ({ ...p })),
      });

      abrirModalAviso({
        tipo: "exito",
        badge: "EJERCICIO ENVIADO",
        titulo: "¡Ejercicio enviado con éxito!",
        mensaje: `Se envió "${preset.titulo}" a ${
          pacienteSeleccionado.nombre || "tu paciente"
        } con frecuencia: ${freqEncontrada.label}.`,
        irAEnviados: true,
      });
    } catch (e) {
      console.log("Error enviando ejercicio:", e);
      abrirModalAviso({
        tipo: "aviso",
        badge: "ERROR DE ENVÍO",
        titulo: "No se pudo enviar el ejercicio",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEjercicioEditado = async () => {
    if (!pacienteSeleccionado?.uid) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "PACIENTE REQUERIDO",
        titulo: "Selecciona un paciente",
        mensaje:
          "Debes elegir a qué paciente vinculado deseas enviar este ejercicio.",
      });
      return;
    }

    const presetBase = EJERCICIOS_PREESCRITOS.find(
      (p) => p.id === plantillaActivaId,
    );
    if (presetBase && !presetBase.habilitadoEnvio) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "MÓDULO PENDIENTE",
        titulo: "Ejercicio aún no disponible",
        mensaje:
          "Este ejercicio aún no se puede enviar hasta que esté listo su módulo.",
      });
      return;
    }

    if (!tituloEjercicio.trim() || !descripcionEjercicio.trim()) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "CAMPOS INCOMPLETOS",
        titulo: "Completa los detalles",
        mensaje: "Escribe el nombre del ejercicio y las instrucciones.",
      });
      return;
    }

    const yaExiste = ejerciciosPaciente.some(
      (t) =>
        (plantillaActivaId && t.plantillaId === plantillaActivaId) ||
        String(t.titulo || "")
          .trim()
          .toLowerCase() === tituloEjercicio.trim().toLowerCase(),
    );

    if (yaExiste) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "YA ENVIADO",
        titulo: "Ya enviado a este paciente",
        mensaje:
          "Este ejercicio ya está enviado a este paciente. Modifica su frecuencia o instrucciones o cancélalo en Enviados.",
      });
      return;
    }

    try {
      setGuardando(true);
      await enviarEjercicioAPaciente(pacienteSeleccionado.uid, psicologoId, {
        titulo: tituloEjercicio.trim(),
        enfoque: enfoqueEjercicio,
        categoriaEnvio: "ejercicio",
        descripcion: descripcionEjercicio.trim(),
        frecuenciaTipo: frecuenciaEjercicio.tipo,
        intervaloHoras: frecuenciaEjercicio.horas,
        frecuenciaLabel: frecuenciaEjercicio.label,
        plantillaId: plantillaActivaId || null,
        pasos: presetBase?.pasos?.map((p) => ({ ...p })) || [
          {
            tipo: "instruccion",
            label: descripcionEjercicio.trim(),
          },
        ],
      });

      setTituloEjercicio("");
      setDescripcionEjercicio("");
      setPlantillaActivaId(null);

      abrirModalAviso({
        tipo: "exito",
        badge: "EJERCICIO ENVIADO",
        titulo: "¡Ejercicio enviado con éxito!",
        mensaje: `El ejercicio quedó asignado para ${
          pacienteSeleccionado.nombre || "tu paciente"
        } con frecuencia: ${frecuenciaEjercicio.label}.`,
        irAEnviados: true,
      });
    } catch (e) {
      console.log("Error enviando ejercicio:", e);
      abrirModalAviso({
        tipo: "aviso",
        badge: "ERROR DE ENVÍO",
        titulo: "No se pudo enviar el ejercicio",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const agregarPasoPregunta = (tipo = "pregunta") => {
    const textoInicial =
      tipo === "escala"
        ? "Del 1 al 10, ¿qué tanta intensidad sientes en este momento?"
        : tipo === "instruccion"
          ? "Escribe la indicación breve que debe realizar el paciente..."
          : "Escribe la pregunta para el paciente...";

    setPasosPregunta([...pasosPregunta, { tipo, label: textoInicial }]);
  };

  const actualizarPasoPreguntaTexto = (index, texto) => {
    const copia = [...pasosPregunta];
    copia[index] = { ...copia[index], label: texto };
    setPasosPregunta(copia);
  };

  const actualizarPasoPreguntaTipo = (index, nuevoTipo) => {
    const copia = [...pasosPregunta];
    copia[index] = { ...copia[index], tipo: nuevoTipo };
    setPasosPregunta(copia);
  };

  const eliminarPasoPregunta = (index) => {
    if (pasosPregunta.length <= 1) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "MÍNIMO REQUERIDO",
        titulo: "Conserva al menos un elemento",
        mensaje: "Debes conservar al menos una pregunta, escala o indicación.",
      });
      return;
    }
    setPasosPregunta(pasosPregunta.filter((_, i) => i !== index));
  };

  const handleEnviarPreguntas = async () => {
    if (!pacienteSeleccionado?.uid) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "PACIENTE REQUERIDO",
        titulo: "Selecciona un paciente",
        mensaje:
          "Elige primero a qué paciente vinculado deseas enviar estas preguntas.",
      });
      return;
    }

    const pasosLimpios = pasosPregunta.filter((p) => p.label && p.label.trim());
    if (pasosLimpios.length === 0) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "CAMPOS INCOMPLETOS",
        titulo: "Contenido requerido",
        mensaje: "Escribe al menos una pregunta, escala o indicación.",
      });
      return;
    }

    const tituloFinal =
      tituloPregunta.trim() ||
      (pasosLimpios[0].tipo === "escala"
        ? "Escala de seguimiento clínico"
        : pasosLimpios[0].tipo === "instruccion"
          ? "Indicación de seguimiento"
          : "Pregunta de seguimiento clínico");

    const descripcionFinal = pasosLimpios
      .map((p, idx) => `${idx + 1}. ${p.label.trim()}`)
      .join(" | ");

    try {
      setGuardando(true);
      await enviarEjercicioAPaciente(pacienteSeleccionado.uid, psicologoId, {
        titulo: tituloFinal,
        enfoque: "Terapia",
        categoriaEnvio: "pregunta",
        descripcion: descripcionFinal,
        frecuenciaTipo: frecuenciaPregunta.tipo,
        intervaloHoras: frecuenciaPregunta.horas,
        frecuenciaLabel: frecuenciaPregunta.label,
        plantillaId: null,
        pasos: pasosLimpios,
      });

      setTituloPregunta("");
      setPasosPregunta([
        {
          tipo: "pregunta",
          label: "¿Cómo te sentiste hoy y qué pensamiento llamó tu atención?",
        },
      ]);

      abrirModalAviso({
        tipo: "exito",
        badge: "PREGUNTA ENVIADA",
        titulo: "¡Pregunta enviada con éxito!",
        mensaje: `Aparecerá en la app de ${
          pacienteSeleccionado.nombre || "tu paciente"
        } para responder (${frecuenciaPregunta.label}).`,
        irAEnviados: true,
      });
    } catch (e) {
      console.log("Error enviando pregunta:", e);
      abrirModalAviso({
        tipo: "aviso",
        badge: "ERROR DE ENVÍO",
        titulo: "No se pudo enviar la pregunta",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicionTarea = (tarea) => {
    setEditandoTareaId(tarea.id);
    setEditDescripcion(tarea.descripcion || "");
    const freqMatch =
      FRECUENCIAS.find((f) => f.label === tarea.frecuenciaLabel) ||
      FRECUENCIAS[3];
    setEditFrecuenciaSel(freqMatch);
  };

  const guardarEdicionTarea = async (tarea) => {
    if (!pacienteSeleccionado?.uid || !editDescripcion.trim()) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "CAMPO REQUERIDO",
        titulo: "Instrucción requerida",
        mensaje: "Escribe la instrucción actualizada antes de guardar.",
      });
      return;
    }

    try {
      setGuardandoEdicion(true);
      const { actualizarEjercicioAsignado } =
        await import("../../services/lamiSyncService");
      await actualizarEjercicioAsignado(pacienteSeleccionado.uid, tarea.id, {
        descripcion: editDescripcion.trim(),
        frecuenciaTipo: editFrecuenciaSel.tipo,
        intervaloHoras: editFrecuenciaSel.horas,
        frecuenciaLabel: editFrecuenciaSel.label,
      });
      setEditandoTareaId(null);
      abrirModalAviso({
        tipo: "exito",
        badge: "CAMBIOS GUARDADOS",
        titulo: "Configuración actualizada",
        mensaje:
          "Se modificaron la frecuencia y las instrucciones para este paciente.",
      });
    } catch (e) {
      console.log("Error actualizando tarea:", e);
      abrirModalAviso({
        tipo: "aviso",
        badge: "ERROR",
        titulo: "No se pudo actualizar",
        mensaje:
          "Verifica que actualizarEjercicioAsignado exista en lamiSyncService.js.",
      });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleCancelarEjercicio = (tarea) => {
    abrirModalAviso({
      tipo: "confirmar_cancelar",
      badge: "CONFIRMAR CANCELACIÓN",
      titulo: "¿Cancelar este envío?",
      mensaje: `Se quitará "${tarea.titulo}" del plan de ${
        pacienteSeleccionado?.nombre || "este paciente"
      }.`,
      tareaPendienteCancelar: tarea,
    });
  };

  const ejecutarCancelacionConfirmada = async () => {
    const tarea = modalAviso.tareaPendienteCancelar;
    if (!tarea || !pacienteSeleccionado?.uid) return;

    try {
      await eliminarEjercicioAsignado(pacienteSeleccionado.uid, tarea.id);
      if (editandoTareaId === tarea.id) {
        setEditandoTareaId(null);
      }
      cerrarModalAviso();
    } catch (e) {
      abrirModalAviso({
        tipo: "aviso",
        badge: "ERROR",
        titulo: "No se pudo cancelar",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    }
  };

  return (
    <LinearGradient colors={["#F0F9FF", "#F5F3FF"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBadge}>
              PANEL CLÍNICO DEL ESPECIALISTA
            </Text>
            <Text style={styles.headerTitle}>Asignación de Ejercicios</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. BUSCADOR CON LUPA Y PACIENTES CON FOTO */}
          <View style={styles.card}>
            <View style={styles.patientHeaderRow}>
              <Text style={styles.sectionTitle}>
                1. Paciente vinculado ({pacientes.length})
              </Text>
              {pacienteSeleccionado && (
                <View style={styles.selectedPatientBadge}>
                  <AvatarPaciente paciente={pacienteSeleccionado} size={22} />
                  <Text style={styles.selectedPatientBadgeText}>
                    {pacienteSeleccionado.nombre || "Paciente"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#6D28D9" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar paciente por nombre o correo..."
                placeholderTextColor="#94A3B8"
                value={busquedaPaciente}
                onChangeText={setBusquedaPaciente}
              />
              {busquedaPaciente.length > 0 && (
                <TouchableOpacity onPress={() => setBusquedaPaciente("")}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {pacientes.length === 0 ? (
              <Text style={styles.emptyText}>
                Aún no tienes pacientes vinculados. Comparte tu código QR desde
                el Dashboard para vincular pacientes.
              </Text>
            ) : pacientesFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>
                No se encontraron pacientes con "{busquedaPaciente}".
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 10 }}
              >
                {pacientesFiltrados.map((p) => {
                  const activo = pacienteSeleccionado?.uid === p.uid;
                  return (
                    <TouchableOpacity
                      key={p.uid}
                      style={[
                        styles.patientChip,
                        activo && styles.patientChipActive,
                      ]}
                      onPress={() => {
                        setPacienteSeleccionado(p);
                        setEditandoTareaId(null);
                      }}
                    >
                      <AvatarPaciente paciente={p} size={28} />
                      <Text
                        style={[
                          styles.patientChipText,
                          activo && { color: "#FFFFFF" },
                        ]}
                      >
                        {p.nombre || p.correo || "Paciente"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 3 SECCIONES SEPARADAS: EJERCICIOS | PREGUNTAS | ENVIADOS */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabActiva === "ejercicios" && styles.tabBtnActive,
              ]}
              onPress={() => setTabActiva("ejercicios")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tabActiva === "ejercicios" && { color: "#FFF" },
                ]}
              >
                Ejercicios
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabActiva === "preguntas" && styles.tabBtnActive,
              ]}
              onPress={() => setTabActiva("preguntas")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tabActiva === "preguntas" && { color: "#FFF" },
                ]}
              >
                Preguntas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabActiva === "enviados" && styles.tabBtnActive,
              ]}
              onPress={() => setTabActiva("enviados")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tabActiva === "enviados" && { color: "#FFF" },
                ]}
              >
                Enviados ({ejerciciosPaciente.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ================= SECCIÓN 1: EJERCICIOS ================= */}
          {tabActiva === "ejercicios" && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  2. Ejercicios preescritos por caso
                </Text>
                <Text style={styles.subHint}>
                  Revisa qué hace cada ejercicio y envíalo a{" "}
                  <Text style={{ fontWeight: "700", color: "#4C1D95" }}>
                    {pacienteSeleccionado?.nombre || "tu paciente"}
                  </Text>
                  .
                </Text>

                <View style={styles.presetsGrid}>
                  {EJERCICIOS_PREESCRITOS.map((preset) => {
                    const seleccionada = plantillaActivaId === preset.id;
                    const yaEnviado = Boolean(
                      buscarTareaAsignadaDePlantilla(preset),
                    );
                    const bloqueadoPorModulo = !preset.habilitadoEnvio;

                    return (
                      <View
                        key={preset.id}
                        style={[
                          styles.presetCard,
                          yaEnviado && styles.presetCardAlreadySent,
                          bloqueadoPorModulo && styles.presetCardDisabled,
                          !yaEnviado &&
                            !bloqueadoPorModulo &&
                            seleccionada &&
                            styles.presetCardActive,
                        ]}
                      >
                        <Image
                          source={preset.imagen}
                          style={styles.presetImage}
                          resizeMode="cover"
                        />

                        <View style={styles.presetTopRow}>
                          <Text style={styles.presetEnfoqueTag}>
                            {preset.enfoque.toUpperCase()} •{" "}
                            {preset.frecuenciaLabel}
                          </Text>
                          {yaEnviado ? (
                            <View style={styles.alreadySentBadge}>
                              <Ionicons
                                name="checkmark-done"
                                size={13}
                                color="#047857"
                              />
                              <Text style={styles.alreadySentBadgeText}>
                                Ya enviado
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.presetTitle}>{preset.titulo}</Text>
                        <Text style={styles.presetCase}>
                          Caso: {preset.caso}
                        </Text>

                        <Text style={styles.presetWhatLabel}>
                          ¿Qué hace este ejercicio?
                        </Text>
                        <Text style={styles.presetDesc}>{preset.queHace}</Text>

                        <Text
                          style={[
                            styles.presetStatus,
                            bloqueadoPorModulo && { color: "#92400E" },
                          ]}
                        >
                          {yaEnviado
                            ? "Ya enviado a este paciente • Edítalo o cancélalo en Enviados"
                            : preset.estadoModulo}
                        </Text>

                        {yaEnviado ? (
                          <View style={styles.presetActionsRow}>
                            <TouchableOpacity
                              style={styles.presetManageBtn}
                              activeOpacity={0.85}
                              onPress={() => setTabActiva("enviados")}
                            >
                              <Ionicons
                                name="create-outline"
                                size={15}
                                color="#047857"
                              />
                              <Text style={styles.presetManageBtnText}>
                                Modificar / Cancelar en Enviados
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : bloqueadoPorModulo ? (
                          <View style={styles.presetActionsRow}>
                            <View style={styles.presetPendingBox}>
                              <Text style={styles.presetPendingText}>
                                Pendiente de módulo — se habilitará al
                                terminarlo
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.presetActionsRow}>
                            <TouchableOpacity
                              style={styles.presetEditBtn}
                              activeOpacity={0.85}
                              onPress={() => cargarEjercicioParaEditar(preset)}
                            >
                              <Text style={styles.presetEditBtnText}>
                                {seleccionada ? "Cargado ✓" : "Cargar / Editar"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.presetSendBtn}
                              activeOpacity={0.85}
                              disabled={guardando}
                              onPress={() => enviarEjercicioDirecto(preset)}
                            >
                              <Ionicons name="send" size={14} color="#FFFFFF" />
                              <Text style={styles.presetSendBtnText}>
                                Enviar a paciente
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* DETALLES Y FRECUENCIA DEL EJERCICIO (SIN DURACIÓN SUGERIDA) */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  3. Detalles y frecuencia del ejercicio
                </Text>

                <Text style={styles.fieldLabel}>Nombre del ejercicio *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Técnica cognitiva ABCDE / Respiración 4-7-8..."
                  placeholderTextColor="#94A3B8"
                  value={tituloEjercicio}
                  onChangeText={setTituloEjercicio}
                />

                <Text style={styles.fieldLabel}>Enfoque</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 8 }}
                >
                  {ENFOQUES.map((enf) => {
                    const act = enfoqueEjercicio === enf;
                    return (
                      <TouchableOpacity
                        key={enf}
                        style={[
                          styles.smallChip,
                          act && styles.smallChipActive,
                        ]}
                        onPress={() => setEnfoqueEjercicio(enf)}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            act && { color: "#FFF" },
                          ]}
                        >
                          {enf}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.fieldLabel}>
                  Detalles e instrucciones para el paciente *
                </Text>
                <TextInput
                  style={[styles.input, { minHeight: 75 }]}
                  multiline
                  placeholder="Escribe los detalles e instrucciones para el paciente..."
                  placeholderTextColor="#94A3B8"
                  value={descripcionEjercicio}
                  onChangeText={setDescripcionEjercicio}
                />

                <Text style={styles.fieldLabel}>
                  ¿Cada cuánto tiempo volver a hacerlo?
                </Text>
                <Text style={styles.subHint}>
                  Volverá a aparecer en el celular del paciente según esta
                  frecuencia.
                </Text>
                <View style={styles.freqGrid}>
                  {FRECUENCIAS.map((freq) => {
                    const activo = frecuenciaEjercicio.label === freq.label;
                    return (
                      <TouchableOpacity
                        key={freq.label}
                        style={[
                          styles.freqCard,
                          activo && styles.freqCardActive,
                        ]}
                        onPress={() => setFrecuenciaEjercicio(freq)}
                      >
                        <Ionicons
                          name={
                            freq.tipo === "unica"
                              ? "checkmark-done-circle-outline"
                              : "repeat-outline"
                          }
                          size={18}
                          color={activo ? "#FFFFFF" : "#6D28D9"}
                        />
                        <Text
                          style={[
                            styles.freqCardText,
                            activo && { color: "#FFFFFF" },
                          ]}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={guardando}
                onPress={handleGuardarEjercicioEditado}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {guardando
                    ? "Enviando ejercicio..."
                    : `Enviar ejercicio a ${
                        pacienteSeleccionado?.nombre || "Paciente"
                      }`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ================= SECCIÓN 2: PREGUNTAS (ESCALA / INDICACIÓN) ================= */}
          {tabActiva === "preguntas" && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  2. Preguntas, escalas o indicaciones
                </Text>
                <Text style={styles.subHint}>
                  Envío independiente para no saturar al paciente. Aparecerá en
                  su pantalla para responder y enviar según la frecuencia
                  elegida.
                </Text>

                <Text style={styles.fieldLabel}>Título (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Seguimiento de ansiedad o chequeo del día..."
                  placeholderTextColor="#94A3B8"
                  value={tituloPregunta}
                  onChangeText={setTituloPregunta}
                />

                {pasosPregunta.map((paso, index) => (
                  <View key={index} style={styles.stepBox}>
                    <View style={styles.stepBoxHeader}>
                      <Text style={styles.stepBoxNum}>
                        Reactivo #{index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => eliminarPasoPregunta(index)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#DC2626"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.stepTypesRow}>
                      {TIPOS_PASO.map((tp) => {
                        const act = paso.tipo === tp.key;
                        return (
                          <TouchableOpacity
                            key={tp.key}
                            style={[
                              styles.typePill,
                              act && styles.typePillActive,
                            ]}
                            onPress={() =>
                              actualizarPasoPreguntaTipo(index, tp.key)
                            }
                          >
                            <Text
                              style={[
                                styles.typePillText,
                                act && { color: "#FFF" },
                              ]}
                            >
                              {tp.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[styles.input, { marginTop: 8, minHeight: 62 }]}
                      multiline
                      placeholder="Escribe la pregunta, escala o indicación..."
                      placeholderTextColor="#94A3B8"
                      value={paso.label}
                      onChangeText={(txt) =>
                        actualizarPasoPreguntaTexto(index, txt)
                      }
                    />
                  </View>
                ))}

                <View style={styles.addStepButtonsRow}>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPasoPregunta("pregunta")}
                  >
                    <Text style={styles.addStepBtnText}>+ Pregunta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPasoPregunta("escala")}
                  >
                    <Text style={styles.addStepBtnText}>+ Escala (1-10)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPasoPregunta("instruccion")}
                  >
                    <Text style={styles.addStepBtnText}>+ Indicación</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  ¿Cada cuánto tiempo debe responderlo?
                </Text>
                <Text style={styles.subHint}>
                  Volverá a mostrarse en el celular del paciente según esta
                  frecuencia.
                </Text>
                <View style={styles.freqGrid}>
                  {FRECUENCIAS.map((freq) => {
                    const activo = frecuenciaPregunta.label === freq.label;
                    return (
                      <TouchableOpacity
                        key={freq.label}
                        style={[
                          styles.freqCard,
                          activo && styles.freqCardActive,
                        ]}
                        onPress={() => setFrecuenciaPregunta(freq)}
                      >
                        <Ionicons
                          name={
                            freq.tipo === "unica"
                              ? "checkmark-done-circle-outline"
                              : "repeat-outline"
                          }
                          size={18}
                          color={activo ? "#FFFFFF" : "#6D28D9"}
                        />
                        <Text
                          style={[
                            styles.freqCardText,
                            activo && { color: "#FFFFFF" },
                          ]}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={guardando}
                onPress={handleEnviarPreguntas}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {guardando
                    ? "Enviando pregunta..."
                    : `Enviar pregunta a ${
                        pacienteSeleccionado?.nombre || "Paciente"
                      }`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ================= SECCIÓN 3: ENVIADOS ================= */}
          {tabActiva === "enviados" && (
            <>
              {ejerciciosPaciente.length === 0 ? (
                <View
                  style={[
                    styles.card,
                    { alignItems: "center", paddingVertical: 28 },
                  ]}
                >
                  <Ionicons
                    name="clipboard-outline"
                    size={42}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyTitle}>
                    Sin envíos activos para este paciente
                  </Text>
                  <Text style={styles.emptyText}>
                    Envía un ejercicio o una pregunta desde sus pestañas
                    correspondientes.
                  </Text>
                </View>
              ) : (
                ejerciciosPaciente.map((tarea) => {
                  const abierto = expandedTareaId === tarea.id;
                  const estaEditando = editandoTareaId === tarea.id;
                  const registros = Array.isArray(tarea.registrosRespuestas)
                    ? tarea.registrosRespuestas
                    : [];

                  return (
                    <View key={tarea.id} style={styles.card}>
                      <View style={styles.assignedHeaderRow}>
                        <AvatarPaciente
                          paciente={pacienteSeleccionado}
                          size={36}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.assignedEnfoque}>
                            {tarea.categoriaEnvio === "pregunta"
                              ? "💬 PREGUNTA / INDICACIÓN"
                              : "🧘 EJERCICIO"}{" "}
                            • {tarea.frecuenciaLabel || "Única vez"}
                          </Text>
                          <Text style={styles.assignedTitle}>
                            {tarea.titulo}
                          </Text>
                          <Text style={styles.assignedDesc}>
                            {tarea.descripcion}
                          </Text>
                          {tarea.proximoDisponibleISO ? (
                            <Text style={styles.nextRunText}>
                              Próxima aparición en celular:{" "}
                              {formatearFechaHora(tarea.proximoDisponibleISO)}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.manageActionsRow}>
                        <TouchableOpacity
                          style={styles.modifyBtn}
                          onPress={() =>
                            estaEditando
                              ? setEditandoTareaId(null)
                              : iniciarEdicionTarea(tarea)
                          }
                        >
                          <Ionicons
                            name="options-outline"
                            size={15}
                            color="#4C1D95"
                          />
                          <Text style={styles.modifyBtnText}>
                            {estaEditando
                              ? "Cerrar edición"
                              : "Modificar frecuencia / instrucciones"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cancelTaskBtn}
                          onPress={() => handleCancelarEjercicio(tarea)}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={15}
                            color="#DC2626"
                          />
                          <Text style={styles.cancelTaskBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>

                      {estaEditando && (
                        <View style={styles.editBox}>
                          <Text style={styles.fieldLabel}>
                            Instrucciones actualizadas
                          </Text>
                          <TextInput
                            style={[styles.input, { minHeight: 68 }]}
                            multiline
                            value={editDescripcion}
                            onChangeText={setEditDescripcion}
                          />

                          <Text style={styles.fieldLabel}>
                            Nueva frecuencia
                          </Text>
                          <View style={styles.freqGrid}>
                            {FRECUENCIAS.map((freq) => {
                              const act =
                                editFrecuenciaSel.label === freq.label;
                              return (
                                <TouchableOpacity
                                  key={freq.label}
                                  style={[
                                    styles.freqCard,
                                    act && styles.freqCardActive,
                                  ]}
                                  onPress={() => setEditFrecuenciaSel(freq)}
                                >
                                  <Text
                                    style={[
                                      styles.freqCardText,
                                      act && { color: "#FFFFFF" },
                                    ]}
                                  >
                                    {freq.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <TouchableOpacity
                            style={styles.saveEditBtn}
                            disabled={guardandoEdicion}
                            onPress={() => guardarEdicionTarea(tarea)}
                          >
                            <Text style={styles.saveEditBtnText}>
                              {guardandoEdicion
                                ? "Guardando..."
                                : "Guardar cambios"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.assignedStatsRow}>
                        <Text style={styles.assignedStatPill}>
                          Ejecuciones en celular: {tarea.vecesCompletado || 0}
                        </Text>
                        <TouchableOpacity
                          style={styles.toggleResponsesBtn}
                          onPress={() =>
                            setExpandedTareaId(abierto ? null : tarea.id)
                          }
                        >
                          <Text style={styles.toggleResponsesText}>
                            {abierto
                              ? "Ocultar ejecución ▲"
                              : `Ver ejecución (${registros.length}) ▼`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {abierto && (
                        <View style={styles.responsesContainer}>
                          {registros.length === 0 ? (
                            <Text style={styles.emptyText}>
                              Aún no se registra ejecución completada en el
                              celular de{" "}
                              {pacienteSeleccionado?.nombre || "este paciente"}.
                            </Text>
                          ) : (
                            registros.map((reg, rIdx) => (
                              <View
                                key={reg.id || rIdx}
                                style={styles.responseEntryCard}
                              >
                                <Text style={styles.responseDate}>
                                  Ejecución #{registros.length - rIdx} •{" "}
                                  {formatearFechaHora(reg.fechaISO)}
                                </Text>
                                {Array.isArray(reg.respuestas) &&
                                  reg.respuestas.map((itemResp, pIdx) => (
                                    <View key={pIdx} style={{ marginTop: 6 }}>
                                      <Text style={styles.responseQuestion}>
                                        {pIdx + 1}. {itemResp.paso}
                                      </Text>
                                      <Text style={styles.responseAnswer}>
                                        {itemResp.tipo === "escala"
                                          ? `📊 Puntaje: ${itemResp.valor}/10`
                                          : `💬 ${itemResp.valor}`}
                                      </Text>
                                    </View>
                                  ))}
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* MODAL ESTILIZADO PARA CONFIRMACIONES DE ENVÍO Y AVISOS */}
        <Modal
          visible={modalAviso.visible}
          transparent
          animationType="fade"
          onRequestClose={cerrarModalAviso}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View
                style={[
                  styles.modalBadge,
                  modalAviso.tipo === "exito"
                    ? { backgroundColor: "#D1FAE5" }
                    : modalAviso.tipo === "confirmar_cancelar"
                      ? { backgroundColor: "#FEE2E2" }
                      : { backgroundColor: "#EDE9FE" },
                ]}
              >
                <Ionicons
                  name={
                    modalAviso.tipo === "exito"
                      ? "checkmark-circle"
                      : modalAviso.tipo === "confirmar_cancelar"
                        ? "warning"
                        : "sparkles"
                  }
                  size={16}
                  color={
                    modalAviso.tipo === "exito"
                      ? "#047857"
                      : modalAviso.tipo === "confirmar_cancelar"
                        ? "#DC2626"
                        : "#5B21B6"
                  }
                />
                <Text
                  style={[
                    styles.modalBadgeText,
                    modalAviso.tipo === "exito"
                      ? { color: "#047857" }
                      : modalAviso.tipo === "confirmar_cancelar"
                        ? { color: "#DC2626" }
                        : { color: "#5B21B6" },
                  ]}
                >
                  {modalAviso.badge}
                </Text>
              </View>

              <Text style={styles.modalTitle}>{modalAviso.titulo}</Text>
              <Text style={styles.modalMessage}>{modalAviso.mensaje}</Text>

              {modalAviso.tipo === "confirmar_cancelar" ? (
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={cerrarModalAviso}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Mantener</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalDangerBtn}
                    onPress={ejecutarCancelacionConfirmada}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Sí, cancelar</Text>
                  </TouchableOpacity>
                </View>
              ) : modalAviso.irAEnviados ? (
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={cerrarModalAviso}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalSecondaryBtnText}>
                      Seguir aquí
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1.2 }}
                    onPress={cerrarModalAviso}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={["#7C3AED", "#5B21B6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalPrimaryBtn}
                    >
                      <Text style={styles.modalPrimaryBtnText}>
                        Ver Enviados
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ width: "100%", marginTop: 14 }}
                  onPress={cerrarModalAviso}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#7C3AED", "#5B21B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalPrimaryBtn}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Entendido</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    backgroundColor: "#FFFFFF",
    padding: 9,
    borderRadius: 12,
    elevation: 2,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6D28D9",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  subHint: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 10,
  },
  patientHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  selectedPatientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedPatientBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#5B21B6",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#1E293B",
  },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  patientChipActive: {
    backgroundColor: "#7C3AED",
  },
  patientChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4C1D95",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE",
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  tabBtnActive: {
    backgroundColor: "#7C3AED",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4C1D95",
    textAlign: "center",
  },
  presetsGrid: {
    gap: 12,
  },
  presetCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
  },
  presetCardActive: {
    backgroundColor: "#F5F3FF",
    borderColor: "#7C3AED",
  },
  presetCardAlreadySent: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  presetCardDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.85,
  },
  presetImage: {
    width: "100%",
    height: 112,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#EDE9FE",
  },
  presetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  presetEnfoqueTag: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#6D28D9",
    flex: 1,
  },
  alreadySentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alreadySentBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#047857",
  },
  presetTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  presetCase: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
    marginTop: 2,
  },
  presetWhatLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
    marginTop: 6,
  },
  presetDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    lineHeight: 17,
  },
  presetStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6D28D9",
    marginTop: 6,
  },
  presetActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  presetEditBtn: {
    flex: 1,
    backgroundColor: "#EDE9FE",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetEditBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5B21B6",
  },
  presetSendBtn: {
    flex: 1.25,
    flexDirection: "row",
    backgroundColor: "#7C3AED",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  presetSendBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  presetManageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingVertical: 10,
    borderRadius: 10,
  },
  presetManageBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  presetPendingBox: {
    flex: 1,
    backgroundColor: "#FEF3C7",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  presetPendingText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#92400E",
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1E293B",
    textAlignVertical: "top",
  },
  smallChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  smallChipActive: {
    backgroundColor: "#6D28D9",
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  freqGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  freqCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  freqCardActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  freqCardText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4C1D95",
  },
  stepBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  stepBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepBoxNum: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4C1D95",
  },
  stepTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  typePill: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typePillActive: {
    backgroundColor: "#6D28D9",
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  addStepButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  addStepBtn: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addStepBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5B21B6",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 999,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  assignedHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  assignedEnfoque: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C3AED",
  },
  assignedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  assignedDesc: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  nextRunText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F766E",
    marginTop: 4,
  },
  manageActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  modifyBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  modifyBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#4C1D95",
  },
  cancelTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  cancelTaskBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  editBox: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    padding: 12,
  },
  saveEditBtn: {
    marginTop: 10,
    backgroundColor: "#6D28D9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  saveEditBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  assignedStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  assignedStatPill: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  toggleResponsesBtn: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleResponsesText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5B21B6",
  },
  responsesContainer: {
    marginTop: 12,
    gap: 10,
  },
  responseEntryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  responseDate: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D28D9",
    marginBottom: 4,
  },
  responseQuestion: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  responseAnswer: {
    fontSize: 13,
    color: "#0F172A",
    marginTop: 2,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 16,
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: "#F3E8FF",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    color: "#4C1D95",
    fontSize: 13,
    fontWeight: "800",
  },
  modalPrimaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
