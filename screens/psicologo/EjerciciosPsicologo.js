import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Alert,
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

const ENFOQUES = [
  "Terapia",
  "Regulación",
  "Activación ",
];

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

export default function EjerciciosPsicologo({ route, navigation }) {
  const pacienteInicial = route?.params?.paciente || null;
  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";

  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState(pacienteInicial);
  const [tabActiva, setTabActiva] = useState("crear"); // "crear" | "asignados"

  // Estado del Creador de Ejercicio Personalizado
  const [titulo, setTitulo] = useState("");
  const [enfoque, setEnfoque] = useState(ENFOQUES[0]);
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState("5 - 10 min");
  const [frecuenciaSel, setFrecuenciaSel] = useState(FRECUENCIAS[3]); // Diario por defecto
  const [pasos, setPasos] = useState([
    {
      tipo: "instruccion",
      label: "Realiza 3 respiraciones profundas antes de comenzar.",
    },
    {
      tipo: "pregunta",
      label: "¿Qué pensamiento o sensación notaste durante el ejercicio?",
    },
    {
      tipo: "escala",
      label: "¿En qué nivel del 1 al 10 se encuentra tu ansiedad al terminar?",
    },
  ]);
  const [guardando, setGuardando] = useState(false);

  // Ejercicios asignados y respuestas del paciente seleccionado
  const [ejerciciosPaciente, setEjerciciosPaciente] = useState([]);
  const [expandedTareaId, setExpandedTareaId] = useState(null);

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
      }
    );
    return () => unsubTareas && unsubTareas();
  }, [pacienteSeleccionado?.uid]);

  const agregarPaso = (tipo = "pregunta") => {
    const placeholderPorTipo =
      tipo === "escala"
        ? "Del 1 al 10, ¿qué tanta tensión sientes ahora?"
        : tipo === "instruccion"
        ? "Describe la indicación paso a paso que debe seguir el paciente..."
        : "Escribe la pregunta terapéutica para el paciente...";

    setPasos([...pasos, { tipo, label: placeholderPorTipo }]);
  };

  const actualizarPasoTexto = (index, texto) => {
    const copia = [...pasos];
    copia[index] = { ...copia[index], label: texto };
    setPasos(copia);
  };

  const actualizarPasoTipo = (index, nuevoTipo) => {
    const copia = [...pasos];
    copia[index] = { ...copia[index], tipo: nuevoTipo };
    setPasos(copia);
  };

  const eliminarPaso = (index) => {
    if (pasos.length <= 1) {
      Alert.alert(
        "Mínimo 1 paso",
        "El ejercicio debe tener al menos una pregunta, escala o indicación."
      );
      return;
    }
    setPasos(pasos.filter((_, i) => i !== index));
  };

  const handleCrearEjercicio = async () => {
    if (!pacienteSeleccionado?.uid) {
      Alert.alert(
        "Selecciona un paciente",
        "Debes elegir a qué paciente vinculado deseas asignarle este ejercicio."
      );
      return;
    }

    if (!titulo.trim() || !descripcion.trim()) {
      Alert.alert(
        "Datos incompletos",
        "Por favor escribe el nombre del ejercicio y las indicaciones generales."
      );
      return;
    }

    const pasosLimpios = pasos.filter((p) => p.label && p.label.trim());
    if (pasosLimpios.length === 0) {
      Alert.alert(
        "Agrega al menos un paso",
        "Configura al menos una pregunta o indicación para el paciente."
      );
      return;
    }

    try {
      setGuardando(true);
      await enviarEjercicioAPaciente(pacienteSeleccionado.uid, psicologoId, {
        titulo: titulo.trim(),
        enfoque,
        descripcion: descripcion.trim(),
        duracion: duracion.trim() || "5 min",
        frecuenciaTipo: frecuenciaSel.tipo,
        intervaloHoras: frecuenciaSel.horas,
        frecuenciaLabel: frecuenciaSel.label,
        pasos: pasosLimpios,
      });

      setTitulo("");
      setDescripcion("");
      Alert.alert(
        "¡Ejercicio personalizado asignado! 🩺",
        `El ejercicio ya está activo en la app de ${
          pacienteSeleccionado.nombre || "tu paciente"
        } y reemplazó los ejercicios genéricos por defecto.`,
        [
          {
            text: "Ver ejercicios del paciente",
            onPress: () => setTabActiva("asignados"),
          },
          { text: "Crear otro", style: "cancel" },
        ]
      );
    } catch (e) {
      console.log("Error asignando ejercicio personalizado:", e);
      Alert.alert("Error", "No se pudo asignar el ejercicio.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarEjercicio = (tarea) => {
    Alert.alert(
      "Eliminar ejercicio asignado",
      `¿Deseas quitar "${tarea.titulo}" del plan de ${
        pacienteSeleccionado?.nombre || "este paciente"
      }?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarEjercicioAsignado(
                pacienteSeleccionado.uid,
                tarea.id
              );
            } catch (e) {
              Alert.alert("Error", "No se pudo eliminar el ejercicio.");
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#F0F9FF", "#F5F3FF"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
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
            <Text style={styles.headerTitle}>
              Personalización de Ejercicios
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* SELECTOR DE PACIENTE VINCULADO */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              1. Paciente vinculado a personalizar
            </Text>
            {pacientes.length === 0 ? (
              <Text style={styles.emptyText}>
                Aún no tienes pacientes vinculados. Comparte tu código QR desde
                el Dashboard para vincular pacientes.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 8 }}
              >
                {pacientes.map((p) => {
                  const activo = pacienteSeleccionado?.uid === p.uid;
                  return (
                    <TouchableOpacity
                      key={p.uid}
                      style={[
                        styles.patientChip,
                        activo && styles.patientChipActive,
                      ]}
                      onPress={() => setPacienteSeleccionado(p)}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color={activo ? "#FFFFFF" : "#4C1D95"}
                      />
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

          {/* PESTAÑAS: CREAR EJERCICIO VS VER ASIGNADOS Y RESPUESTAS */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabActiva === "crear" && styles.tabBtnActive,
              ]}
              onPress={() => setTabActiva("crear")}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={tabActiva === "crear" ? "#FFF" : "#4C1D95"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tabActiva === "crear" && { color: "#FFF" },
                ]}
              >
                Crear Ejercicio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabActiva === "asignados" && styles.tabBtnActive,
              ]}
              onPress={() => setTabActiva("asignados")}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={18}
                color={tabActiva === "asignados" ? "#FFF" : "#4C1D95"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tabActiva === "asignados" && { color: "#FFF" },
                ]}
              >
                Asignados y Respuestas ({ejerciciosPaciente.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ================= VISTA 1: CONSTRUCTOR DE EJERCICIO ================= */}
          {tabActiva === "crear" && (
            <>
              <View style={styles.infoBanner}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color="#5B21B6"
                />
                <Text style={styles.infoBannerText}>
                  Al asignarle al menos 1 ejercicio personalizado a{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {pacienteSeleccionado?.nombre || "tu paciente"}
                  </Text>
                  , los ejercicios genéricos de la app se ocultarán y verá
                  únicamente tu plan terapéutico.
                </Text>
              </View>

              {/* DATOS GENERALES DEL EJERCICIO */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  2. Datos del Ejercicio Clínico
                </Text>

                <Text style={styles.fieldLabel}>Nombre del ejercicio *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Diario de cuestionamiento nocturno / Exposición gradual..."
                  placeholderTextColor="#94A3B8"
                  value={titulo}
                  onChangeText={setTitulo}
                />

                <Text style={styles.fieldLabel}>Enfoque terapéutico</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 8 }}
                >
                  {ENFOQUES.map((enf) => {
                    const act = enfoque === enf;
                    return (
                      <TouchableOpacity
                        key={enf}
                        style={[
                          styles.smallChip,
                          act && styles.smallChipActive,
                        ]}
                        onPress={() => setEnfoque(enf)}
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
                  Indicaciones generales para el paciente *
                </Text>
                <TextInput
                  style={[styles.input, { minHeight: 75 }]}
                  multiline
                  placeholder="Explica brevemente el propósito del ejercicio y cómo debe prepararse el paciente..."
                  placeholderTextColor="#94A3B8"
                  value={descripcion}
                  onChangeText={setDescripcion}
                />

                <Text style={styles.fieldLabel}>Duración sugerida</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 5 - 10 minutos"
                  placeholderTextColor="#94A3B8"
                  value={duracion}
                  onChangeText={setDuracion}
                />
              </View>

              {/* FRECUENCIA */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  3. Frecuencia y Recurrencia
                </Text>
                <Text style={styles.subHint}>
                  Elige si el paciente debe realizarlo una sola vez o de forma
                  recurrente:
                </Text>

                <View style={styles.freqGrid}>
                  {FRECUENCIAS.map((freq) => {
                    const activo = frecuenciaSel.label === freq.label;
                    return (
                      <TouchableOpacity
                        key={freq.label}
                        style={[
                          styles.freqCard,
                          activo && styles.freqCardActive,
                        ]}
                        onPress={() => setFrecuenciaSel(freq)}
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

              {/* CONSTRUCTOR DE PASOS Y PREGUNTAS */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  4. Preguntas, Escalas o Indicaciones ({pasos.length})
                </Text>
                <Text style={styles.subHint}>
                  Configura los pasos que el paciente deberá responder o seguir
                  dentro del ejercicio:
                </Text>

                {pasos.map((paso, index) => (
                  <View key={index} style={styles.stepBox}>
                    <View style={styles.stepBoxHeader}>
                      <Text style={styles.stepBoxNum}>Paso #{index + 1}</Text>
                      <TouchableOpacity onPress={() => eliminarPaso(index)}>
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
                            onPress={() => actualizarPasoTipo(index, tp.key)}
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
                      style={[styles.input, { marginTop: 8, minHeight: 60 }]}
                      multiline
                      placeholder="Escribe la pregunta o indicación para este paso..."
                      placeholderTextColor="#94A3B8"
                      value={paso.label}
                      onChangeText={(txt) => actualizarPasoTexto(index, txt)}
                    />
                  </View>
                ))}

                <View style={styles.addStepButtonsRow}>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPaso("pregunta")}
                  >
                    <Text style={styles.addStepBtnText}>
                      + Pregunta abierta
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPaso("escala")}
                  >
                    <Text style={styles.addStepBtnText}>+ Escala 1-10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addStepBtn}
                    onPress={() => agregarPaso("instruccion")}
                  >
                    <Text style={styles.addStepBtnText}>+ Indicación</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={guardando}
                onPress={handleCrearEjercicio}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {guardando
                    ? "Asignando ejercicio..."
                    : `Asignar ejercicio a ${
                        pacienteSeleccionado?.nombre || "Paciente"
                      }`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ================= VISTA 2: EJERCICIOS ASIGNADOS Y RESPUESTAS DEL PACIENTE ================= */}
          {tabActiva === "asignados" && (
            <>
              {ejerciciosPaciente.length === 0 ? (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
                  <Ionicons
                    name="clipboard-outline"
                    size={42}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyTitle}>
                    Sin ejercicios personalizados activos
                  </Text>
                  <Text style={styles.emptyText}>
                    Actualmente{" "}
                    {pacienteSeleccionado?.nombre || "este paciente"} está
                    viendo los 5 ejercicios por defecto de LamiApp. Crea un
                    ejercicio personalizado en la pestaña anterior para
                    reemplazarlos.
                  </Text>
                </View>
              ) : (
                ejerciciosPaciente.map((tarea) => {
                  const abierto = expandedTareaId === tarea.id;
                  const registros = Array.isArray(tarea.registrosRespuestas)
                    ? tarea.registrosRespuestas
                    : [];

                  return (
                    <View key={tarea.id} style={styles.card}>
                      <View style={styles.assignedHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.assignedEnfoque}>
                            🩺 {tarea.enfoque} •{" "}
                            {tarea.frecuenciaLabel || "Única vez"}
                          </Text>
                          <Text style={styles.assignedTitle}>
                            {tarea.titulo}
                          </Text>
                          <Text style={styles.assignedDesc}>
                            {tarea.descripcion}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteIconBtn}
                          onPress={() => handleEliminarEjercicio(tarea)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#DC2626"
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.assignedStatsRow}>
                        <Text style={styles.assignedStatPill}>
                          ✓ Completado {tarea.vecesCompletado || 0} vez/veces
                        </Text>
                        <TouchableOpacity
                          style={styles.toggleResponsesBtn}
                          onPress={() =>
                            setExpandedTareaId(abierto ? null : tarea.id)
                          }
                        >
                          <Text style={styles.toggleResponsesText}>
                            {abierto
                              ? "Ocultar respuestas ▲"
                              : `Ver respuestas (${registros.length}) ▼`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {abierto && (
                        <View style={styles.responsesContainer}>
                          {registros.length === 0 ? (
                            <Text style={styles.emptyText}>
                              El paciente aún no ha enviado respuestas para este
                              ejercicio.
                            </Text>
                          ) : (
                            registros.map((reg, rIdx) => (
                              <View
                                key={reg.id || rIdx}
                                style={styles.responseEntryCard}
                              >
                                <Text style={styles.responseDate}>
                                  Sesión #{registros.length - rIdx} •{" "}
                                  {formatearFechaHora(reg.fechaISO)}
                                </Text>
                                {Array.isArray(reg.respuestas) &&
                                  reg.respuestas.map((itemResp, pIdx) => (
                                    <View
                                      key={pIdx}
                                      style={{ marginTop: 6 }}
                                    >
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
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 14,
    paddingVertical: 9,
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
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EDE9FE",
    paddingVertical: 11,
    borderRadius: 14,
  },
  tabBtnActive: {
    backgroundColor: "#7C3AED",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4C1D95",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#4C1D95",
    lineHeight: 18,
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
  deleteIconBtn: {
    backgroundColor: "#FEE2E2",
    padding: 8,
    borderRadius: 10,
  },
  assignedStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
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
});
