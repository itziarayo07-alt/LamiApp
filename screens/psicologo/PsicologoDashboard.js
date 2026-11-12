import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Alert,
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
  enviarEjercicioAPaciente,
  escucharMisPacientes,
} from "../../services/lamiSyncService";

export default function PsicologoDashboard({ navigation }) {
  const [tab, setTab] = useState("pacientes"); // pacientes | flywheel
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

  // Modal asignar ejercicio
  const [modalVisible, setModalVisible] = useState(false);
  const [tituloEj, setTituloEj] = useState("");
  const [descEj, setDescEj] = useState("");
  const [enfoqueEj, setEnfoqueEj] = useState("Ansiedad");
  const [preguntaPaso, setPreguntaPaso] = useState("");

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const codigoVinculacion = "PSI-492";

  useEffect(() => {
    const unsub = escucharMisPacientes(psicologoId, (lista) => {
      setPacientes(lista);
    });
    return () => unsub();
  }, [psicologoId]);

  // Cálculo del Sistema Flywheel (Meta: 10 pacientes activos en Plan Semilla/Pro)
  const mesActual = new Date().toISOString().slice(0, 7);
  const pacientesActivosMes = pacientes.filter(
    (p) => p.activoEnMes === mesActual
  ).length;
  const metaGratis = 10;
  const porcentajeDescuento = Math.min(
    100,
    Math.round((pacientesActivosMes / metaGratis) * 100)
  );
  const cuotaActual = Math.max(
    0,
    Math.round(599 * (1 - porcentajeDescuento / 100))
  );

  const handleEnviarEjercicio = async () => {
    if (!pacienteSeleccionado || !tituloEj.trim()) {
      Alert.alert("Faltan datos", "Escribe un título para el ejercicio.");
      return;
    }

    try {
      await enviarEjercicioAPaciente(pacienteSeleccionado.uid, psicologoId, {
        titulo: tituloEj.trim(),
        descripcion:
          descEj.trim() || "Realiza esta actividad con calma y registra tu avance.",
        duracion: "5 min",
        enfoque: enfoqueEj,
        pasos: preguntaPaso.trim()
          ? [{ tipo: "pregunta", label: preguntaPaso.trim() }]
          : [],
      });

      Alert.alert(
        "Enviado a Lami 💜",
        `El ejercicio apareció en tiempo real en la pantalla de ${pacienteSeleccionado.nombre || "tu paciente"}.`
      );
      setTituloEj("");
      setDescEj("");
      setPreguntaPaso("");
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo enviar el ejercicio.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBadge}>LAMI ESPECIALISTA</Text>
          <Text style={styles.headerTitle}>Consultorio Clínico</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.replace("Login")}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "pacientes" ? (
          <>
            <Text style={styles.sectionTitle}>
              Pacientes vinculados ({pacientes.length})
            </Text>

            {pacientes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aún no tienes pacientes vinculados</Text>
                <Text style={styles.emptyText}>
                  Comparte tu código <Text style={{ fontWeight: "800" }}>{codigoVinculacion}</Text> en
                  consulta para que tus pacientes se conecten desde su Perfil.
                </Text>
              </View>
            ) : (
              pacientes.map((pac) => (
                <View key={pac.uid} style={styles.patientCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>
                      {pac.nombre || pac.correo || "Paciente Lami"}
                    </Text>
                    <Text style={styles.patientMeta}>
                      Protocolo: {pac.protocoloClinico || "Ansiedad"} • Estado:{" "}
                      {pac.activoEnMes === mesActual ? "Activo este mes ✅" : "Pendiente"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => {
                      setPacienteSeleccionado(pac);
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.assignBtnText}>Tarea</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          /* PANTALLA QR Y FLYWHEEL $0 MXN */
          <>
            <View style={styles.qrCard}>
              <Text style={styles.qrPill}>MUESTRA ESTA PANTALLA EN CONSULTA</Text>
              <View style={styles.qrBox}>
                <Ionicons name="qr-code-outline" size={130} color="#1E1B4B" />
              </View>
              <Text style={styles.codeLabel}>Código alfanumérico para el paciente:</Text>
              <Text style={styles.codeBig}>{codigoVinculacion}</Text>
            </View>

            <LinearGradient
              colors={["#4C1D95", "#311068"]}
              style={styles.flywheelCard}
            >
              <View style={styles.flywheelTop}>
                <Text style={styles.flywheelBadge}>SISTEMA FLYWHEEL ACTIVO</Text>
                <Text style={styles.cuotaText}>Cuota: ${cuotaActual} MXN</Text>
              </View>

              <Text style={styles.flywheelDesc}>
                Tu tarifa profesional ($599/mes) se redujo al{" "}
                <Text style={{ fontWeight: "800" }}>{porcentajeDescuento}%</Text> gracias a tus{" "}
                <Text style={{ fontWeight: "800" }}>{pacientesActivosMes} pacientes activos</Text>.
              </Text>

              <View style={styles.progressBg}>
                <View
                  style={[styles.progressFill, { width: `${porcentajeDescuento}%` }]}
                />
              </View>
              <Text style={styles.progressCaption}>
                Pacientes activos ({pacientesActivosMes} / {metaGratis} para cuota $0)
              </Text>
            </LinearGradient>
          </>
        )}
      </ScrollView>

      {/* MODAL PARA MANDAR EJERCICIO EN VIVO */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Asignar ejercicio a {pacienteSeleccionado?.nombre || "Paciente"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Título (ej. Registro de pensamientos)"
              value={tituloEj}
              onChangeText={setTituloEj}
            />
            <TextInput
              style={styles.input}
              placeholder="Enfoque (Ansiedad, Duelo, Burnout, Depresión)"
              value={enfoqueEj}
              onChangeText={setEnfoqueEj}
            />
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              multiline
              placeholder="Instrucciones para el paciente..."
              value={descEj}
              onChangeText={setDescEj}
            />
            <TextInput
              style={styles.input}
              placeholder="Pregunta de reflexión (opcional)"
              value={preguntaPaso}
              onChangeText={setPreguntaPaso}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#4B5563", fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleEnviarEjercicio}
              >
                <Text style={{ color: "#FFF", fontWeight: "700" }}>Enviar ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BARRA INFERIOR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTab("pacientes")}
        >
          <Ionicons
            name="people"
            size={24}
            color={tab === "pacientes" ? "#7C3AED" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabLabel,
              tab === "pacientes" && { color: "#7C3AED", fontWeight: "700" },
            ]}
          >
            Pacientes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setTab("flywheel")}
        >
          <Ionicons
            name="qr-code"
            size={24}
            color={tab === "flywheel" ? "#7C3AED" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabLabel,
              tab === "flywheel" && { color: "#7C3AED", fontWeight: "700" },
            ]}
          >
            QR & $0
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerBadge: { fontSize: 11, fontWeight: "800", color: "#7C3AED" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  logoutBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 12 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  emptyCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    elevation: 2,
  },
  patientName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  patientMeta: { fontSize: 12, color: "#6B7280", marginTop: 3 },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 4,
  },
  assignBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  qrCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
  },
  qrPill: {
    backgroundColor: "#F3E8FF",
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  qrBox: { padding: 14, borderWidth: 3, borderColor: "#1E1B4B", borderRadius: 20 },
  codeLabel: { fontSize: 12, color: "#6B7280", marginTop: 14 },
  codeBig: { fontSize: 28, fontWeight: "900", color: "#5B21B6", letterSpacing: 4 },
  flywheelCard: { borderRadius: 24, padding: 20 },
  flywheelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  flywheelBadge: {
    backgroundColor: "#FACC15",
    color: "#1E1B4B",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cuotaText: { color: "#34D399", fontSize: 16, fontWeight: "800" },
  flywheelDesc: { color: "#F3E8FF", fontSize: 13, lineHeight: 19, marginBottom: 14 },
  progressBg: { height: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#34D399" },
  progressCaption: { color: "#DDD6FE", fontSize: 11, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#F3F4F6", alignItems: "center" },
  sendBtn: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#7C3AED", alignItems: "center" },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
});