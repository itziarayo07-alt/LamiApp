import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
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
  bgCanvas: "#F7FAFC",
  cardWhite: "#FFFFFF",
  textDark: "#1E293B",
  textMuted: "#64748B",
};

const PAQUETES = [
  { id: "semilla", nombre: "Semilla", limite: 10, precio: 299 },
  { id: "profesional", nombre: "Profesional", limite: 30, precio: 599 },
  { id: "consultorio", nombre: "Consultorio", limite: 100, precio: 1299 },
];

export default function FlywheelQR({ navigation }) {
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState("profesional");
  const [copiado, setCopiado] = useState(false);

  // Estados para cambio de plan y pago de diferencia
  const [modalCambioPlanVisible, setModalCambioPlanVisible] = useState(false);
  const [nuevoPlanSeleccionado, setNuevoPlanSeleccionado] = useState(null);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("tarjeta");
  const [titularTarjeta, setTitularTarjeta] = useState("");
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [expiracionTarjeta, setExpiracionTarjeta] = useState("");
  const [cvvTarjeta, setCvvTarjeta] = useState("");
  const [correoPaypal, setCorreoPaypal] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Estado que recuerda si se seleccionó o no la bonificación de pacientes premium en la barra
  const [usarPremiumEnBarra, setUsarPremiumEnBarra] = useState(true);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const mesActual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubPerfil = onSnapshot(
      doc(db, "psicologos", auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPerfilPsicologo(data);
          if (data.plan && PAQUETES.some((p) => p.id === data.plan)) {
            setPaqueteSeleccionado(data.plan);
            setNuevoPlanSeleccionado(data.plan);
          }
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  useEffect(() => {
    const unsubPac = escucharMisPacientes(psicologoId, (lista) => {
      setPacientes(lista || []);
    });
    return () => unsubPac && unsubPac();
  }, [psicologoId]);

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

  const payloadQR = `LAMI-LINK|${codigoVinculacion}|${psicologoId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&color=1E293B&bgcolor=FFFFFF&data=${encodeURIComponent(
    payloadQR
  )}`;

  const pacientesActivosMes = useMemo(
    () => pacientes.filter((p) => p.activoEnMes === mesActual).length,
    [pacientes, mesActual]
  );

  const pacientesPremium = useMemo(
    () =>
      pacientes.filter(
        (p) => p.plan === "premium" || p.esPremium === true
      ).length,
    [pacientes]
  );

  const infoPaquete =
    PAQUETES.find((p) => p.id === paqueteSeleccionado) || PAQUETES[1];

  // Cálculo: 30 pesos por paciente activo + 15% de 149 MXN (~$22.35 MXN) por paciente premium
  const bonificacionRegular = pacientesActivosMes * 30;
  const bonificacionPremiumTotal = pacientesPremium * (149 * 0.15);

  const descuentoTotal =
    bonificacionRegular + (usarPremiumEnBarra ? bonificacionPremiumTotal : 0);
  const cuotaAPagar = Math.max(0, infoPaquete.precio - descuentoTotal);

  const saldoRestanteParaCero = Math.max(0, infoPaquete.precio - descuentoTotal);
  const pacientesParaGratis = Math.ceil(
    saldoRestanteParaCero / 30
  );

  const comisionMensualMXN = Math.round(pacientesPremium * 149 * 0.15);

  // Lógica de planes actual, nuevo y diferencia
  const planActualObj = infoPaquete;
  const planNuevoObj = PAQUETES.find((p) => p.id === nuevoPlanSeleccionado) || infoPaquete;
  const diferenciaPlan = planNuevoObj.precio - planActualObj.precio;
  const hayCambioDePlan = nuevoPlanSeleccionado && nuevoPlanSeleccionado !== paqueteSeleccionado;
  const esBajadaDePlan = hayCambioDePlan && diferenciaPlan < 0;

  const formatearNumeroTarjeta = (texto) => {
    const limpio = texto.replace(/\D/g, "").slice(0, 16);
    return limpio.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatearExpiracion = (texto) => {
    const limpio = texto.replace(/\D/g, "").slice(0, 4);
    if (limpio.length >= 3) {
      return `${limpio.slice(0, 2)}/${limpio.slice(2)}`;
    }
    return limpio;
  };

  const handleCopiarCodigo = async () => {
    try {
      const Clipboard = require("expo-clipboard");
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(codigoVinculacion);
      }
    } catch (_) {}
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  const handleCompartirEnlace = async () => {
    try {
      await Share.share({
        message: `Hola, te invito a vincularte conmigo en Lami para dar seguimiento a nuestras sesiones.\n\n1. Descarga o abre tu app Lami.\n2. Ve a tu Perfil e ingresa mi código de especialista: ${codigoVinculacion}\n\nEspecialista: ${nombreMostrar} (Céd. ${cedulaMostrar})`,
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir el menú para compartir.");
    }
  };

  const procesarCambioDePlanYPago = async () => {
    if (!hayCambioDePlan || procesandoPago) return;

    if (diferenciaPlan > 0) {
      if (metodoPagoSeleccionado === "tarjeta") {
        const digitos = numeroTarjeta.replace(/\s/g, "");
        if (!titularTarjeta.trim() || digitos.length < 16 || expiracionTarjeta.length < 5 || cvvTarjeta.length < 3) {
          Alert.alert("Datos incompletos", "Por favor completa correctamente los datos de tu tarjeta para procesar la diferencia.");
          return;
        }
      } else {
        if (!correoPaypal.trim() || !correoPaypal.includes("@")) {
          Alert.alert("PayPal inválido", "Ingresa un correo electrónico válido de PayPal.");
          return;
        }
      }
    }

    try {
      setProcesandoPago(true);
      if (diferenciaPlan > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Única escritura controlada a Firestore para evitar saturación de tráfico
      await updateDoc(doc(db, "psicologos", auth.currentUser.uid), {
        plan: planNuevoObj.id,
        planNombre: planNuevoObj.nombre,
        precioMensual: planNuevoObj.precio,
        limitePacientes: planNuevoObj.limite,
      });

      setPaqueteSeleccionado(planNuevoObj.id);
      setProcesandoPago(false);
      setModalCambioPlanVisible(false);
      Alert.alert("¡Plan actualizado!", `Tu consultorio ahora está en el plan ${planNuevoObj.nombre}.`);
    } catch (e) {
      setProcesandoPago(false);
      Alert.alert("Atención", "El servidor está experimentando tráfico elevado. Intenta de nuevo en un momento.");
    }
  };

  const irAPantalla = (routeName, params = {}) => {
    navigation.navigate(routeName, params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={["#EDF6F8", "#F5F2FF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.decorBubbleLeft} />
          <View style={styles.decorBubbleRight} />

          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[PALETTE.tealDeep, PALETTE.tealMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Ionicons name="pulse" size={21} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flexShrink: 1 }}>
              <View style={styles.brandRow}>
                <Text style={styles.brandTitle} numberOfLines={1}>
                  {nombreMostrar}
                </Text>
                <View style={styles.mobilePill}>
                  <Text style={styles.mobilePillText}>{codigoVinculacion}</Text>
                </View>
              </View>
              <Text style={styles.doctorSubtitle} numberOfLines={1}>
                Céd. {cedulaMostrar} • Lami Clínico
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => irAPantalla("PsicologoDashboard")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={PALETTE.tealDeep}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => irAPantalla("PsicologoDashboard")}
            >
              <LinearGradient
                colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                style={styles.avatarRing}
              >
                {fotoPerfilUri ? (
                  <Image
                    source={{ uri: fotoPerfilUri }}
                    style={styles.avatarPhoto}
                  />
                ) : (
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarInitials}>
                      {inicialesPsicologo || "PSI"}
                    </Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Consultorio & Flywheel</Text>
          <Text style={styles.pageSubtitle}>
            Incentivos y Vinculación B2B2C
          </Text>
        </View>

        <View style={styles.qrMainCard}>
          <View style={styles.qrTopPill}>
            <Text style={styles.qrTopPillText}>
              MUESTRA ESTA PANTALLA EN CONSULTA
            </Text>
          </View>

          <LinearGradient
            colors={[PALETTE.tealSoft, PALETTE.lavenderSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrOuterFrame}
          >
            <View style={styles.qrInnerWhite}>
              <View
                style={{
                  position: "relative",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={{ uri: qrImageUrl }}
                  style={{ width: 185, height: 185, borderRadius: 12 }}
                />

                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  style={[styles.qrCenterEmblem, { top: 70, left: 70 }]}
                >
                  <Ionicons name="pulse" size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>

          <Text style={styles.codeCaption}>
            Código alfanumérico para el paciente:
          </Text>

          <View style={styles.codeCopyRow}>
            <Text style={styles.codeHighlight}>{codigoVinculacion}</Text>
            <TouchableOpacity
              style={[
                styles.copyIconBtn,
                copiado && {
                  backgroundColor: "#E6F3F6",
                  borderColor: PALETTE.tealDeep,
                },
              ]}
              onPress={handleCopiarCodigo}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copiado ? "checkmark" : "copy-outline"}
                size={18}
                color={copiado ? PALETTE.tealDeep : PALETTE.purpleVibrant}
              />
            </TouchableOpacity>
          </View>

          {copiado && (
            <Text style={styles.copiedFeedback}>
              ¡Código {codigoVinculacion} copiado!
            </Text>
          )}

          <Text style={styles.doctorVerifyText}>
            {nombreMostrar} (Céd. {cedulaMostrar})
          </Text>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleCompartirEnlace}
            activeOpacity={0.85}
          >
            <Ionicons
              name="share-social-outline"
              size={17}
              color={PALETTE.purpleVibrant}
            />
            <Text style={styles.shareBtnText}>
              Compartir enlace de vinculación
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta Flywheel y Plan Actual */}
        <LinearGradient
          colors={["#3A2D5C", PALETTE.indigoMuted, PALETTE.purpleVibrant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.flywheelCard}
        >
          <View style={styles.flywheelOrb} />

          <View style={styles.flywheelHeaderRow}>
            <View style={styles.flywheelGoldPill}>
              <Text style={styles.flywheelGoldText}>
                SISTEMA FLYWHEEL ACTIVO
              </Text>
            </View>
            <Text style={styles.cuotaFinalText}>
              Cuota: ${cuotaAPagar.toLocaleString("es-MX")} MXN
            </Text>
          </View>

          <View style={styles.planActivoContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.packageLabelActiveTitle}>Tu Plan Actual:</Text>
              <Text style={styles.packageActiveName}>{infoPaquete.nombre}</Text>
              <Text style={styles.packageActiveSub}>
                Hasta {infoPaquete.limite} pacientes • ${infoPaquete.precio} MXN/mes
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeBtnMini}
              onPress={() => {
                setNuevoPlanSeleccionado(paqueteSeleccionado);
                setModalCambioPlanVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.upgradeBtnMiniText}>Cambiar Plan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelsRow}>
              <Text style={styles.progressLeftLabel}>
                Progreso ({pacientesActivosMes} regulares × $30{usarPremiumEnBarra && pacientesPremium > 0 ? ` + 15% Premium` : ""})
              </Text>
              <Text style={styles.progressRightLabel}>
                -${Math.round(descuentoTotal).toLocaleString("es-MX")} MXN
              </Text>
            </View>

            {/* Barra de progreso multitono: Verde (regulares) + Amarillo/Dorado (Premium) */}
            <View style={styles.progressTrackMulti}>
              <View
                style={[
                  styles.progressFillGreen,
                  { width: `${Math.min(100, (bonificacionRegular / infoPaquete.precio) * 100)}%` },
                ]}
              />
              {usarPremiumEnBarra && bonificacionPremiumTotal > 0 && (
                <View
                  style={[
                    styles.progressFillYellow,
                    {
                      width: `${Math.min(
                        100 - (bonificacionRegular / infoPaquete.precio) * 100,
                        (bonificacionPremiumTotal / infoPaquete.precio) * 100
                      )}%`,
                    },
                  ]}
                />
              )}
            </View>

            <Text style={styles.progressFootnote}>
              {cuotaAPagar === 0
                ? "¡Meta alcanzada! Tu cuota llegó a $0 este mes. Se reiniciará en el siguiente ciclo ✨"
                : `Te faltan aprox. ${pacientesParaGratis} pacientes activos para llegar a $0 ($30 c/u).`}
            </Text>
          </View>
        </LinearGradient>

        {/* Tarjeta de comisiones y opción de usar/guardar bonificación premium */}
        <LinearGradient
          colors={["#FFFFFF", "#EDF6F8"]}
          style={styles.commissionCard}
        >
          <View style={styles.commissionLeft}>
            <View style={styles.commissionIconBox}>
              <Ionicons
                name="trending-up"
                size={20}
                color={PALETTE.tealDeep}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commissionTitle}>
                Pacientes Premium ({pacientesPremium})
              </Text>
              <Text style={styles.commissionSub}>
                Comisión 15% (~$22.35 c/u): +${comisionMensualMXN} MXN
              </Text>
              <TouchableOpacity
                style={styles.toggleBarBtn}
                onPress={() => setUsarPremiumEnBarra(!usarPremiumEnBarra)}
              >
                <Ionicons
                  name={usarPremiumEnBarra ? "checkbox" : "square-outline"}
                  size={15}
                  color={PALETTE.purpleVibrant}
                />
                <Text style={styles.toggleBarText}>
                  {usarPremiumEnBarra ? "Aplicado a la barra actual" : "No usado en la barra (guardado)"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Modal para cambiar plan (Subida con pago o Bajada sin devolución) */}
      <Modal
        visible={modalCambioPlanVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCambioPlanVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Cambiar Plan de Consultorio</Text>
              <Text style={styles.modalSubtitle}>
                Selecciona tu nuevo nivel de crecimiento clínico:
              </Text>

              <View style={{ gap: 8, marginVertical: 8 }}>
                {PAQUETES.map((pkg) => {
                  const seleccionado = nuevoPlanSeleccionado === pkg.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.modalPlanItem,
                        seleccionado && styles.modalPlanItemActive,
                      ]}
                      onPress={() => setNuevoPlanSeleccionado(pkg.id)}
                      activeOpacity={0.85}
                    >
                      <View>
                        <Text style={[styles.modalPlanName, seleccionado && { color: PALETTE.purpleVibrant }]}>
                          {pkg.nombre}
                        </Text>
                        <Text style={styles.modalPlanDesc}>Hasta {pkg.limite} pacientes vinculados</Text>
                      </View>
                      <Text style={styles.modalPlanPrice}>${pkg.precio} MXN</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Si es bajada de plan (ej. profesional a semilla) */}
              {esBajadaDePlan && (
                <View style={styles.avisoBajadaBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#D97706" />
                  <Text style={styles.avisoBajadaText}>
                    Estás cambiando a un plan más económico. Se realizará el cambio y <Text style={{ fontWeight: "800" }}>no habrá devolución de la diferencia</Text> del periodo actual.
                  </Text>
                </View>
              )}

              {/* Si es subida de plan (ej. semilla a profesional) */}
              {hayCambioDePlan && diferenciaPlan > 0 && (
                <View style={styles.diferenciaBox}>
                  <Text style={styles.diferenciaTitle}>Diferencia a pagar:</Text>
                  <Text style={styles.diferenciaValue}>${diferenciaPlan} MXN</Text>

                  <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Método de pago de diferencia</Text>
                  <View style={styles.payMethodRow}>
                    <TouchableOpacity
                      onPress={() => setMetodoPagoSeleccionado("tarjeta")}
                      style={[styles.payMethodBtn, metodoPagoSeleccionado === "tarjeta" && styles.payMethodBtnActive]}
                    >
                      <Ionicons name="card-outline" size={16} color={metodoPagoSeleccionado === "tarjeta" ? "#FFFFFF" : "#1E293B"} />
                      <Text style={[styles.payMethodBtnText, metodoPagoSeleccionado === "tarjeta" && { color: "#FFFFFF" }]}>Tarjeta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setMetodoPagoSeleccionado("paypal")}
                      style={[styles.payMethodBtn, metodoPagoSeleccionado === "paypal" && styles.payMethodBtnActive]}
                    >
                      <Ionicons name="logo-paypal" size={16} color={metodoPagoSeleccionado === "paypal" ? "#FFFFFF" : "#1E293B"} />
                      <Text style={[styles.payMethodBtnText, metodoPagoSeleccionado === "paypal" && { color: "#FFFFFF" }]}>PayPal</Text>
                    </TouchableOpacity>
                  </View>

                  {metodoPagoSeleccionado === "tarjeta" ? (
                    <View style={styles.payFormBox}>
                      <TextInput
                        style={styles.payInput}
                        placeholder="Nombre del titular"
                        placeholderTextColor="#94A3B8"
                        value={titularTarjeta}
                        onChangeText={setTitularTarjeta}
                      />
                      <TextInput
                        style={styles.payInput}
                        placeholder="0000 0000 0000 0000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={19}
                        value={numeroTarjeta}
                        onChangeText={(t) => setNumeroTarjeta(formatearNumeroTarjeta(t))}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          style={[styles.payInput, { flex: 1 }]}
                          placeholder="MM/AA"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={5}
                          value={expiracionTarjeta}
                          onChangeText={(t) => setExpiracionTarjeta(formatearExpiracion(t))}
                        />
                        <TextInput
                          style={[styles.payInput, { flex: 1 }]}
                          placeholder="CVV"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={4}
                          value={cvvTarjeta}
                          onChangeText={(t) => setCvvTarjeta(t.replace(/\D/g, "").slice(0, 4))}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.payFormBox}>
                      <TextInput
                        style={styles.payInput}
                        placeholder="tucuenta@paypal.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={correoPaypal}
                        onChangeText={setCorreoPaypal}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Botón principal de acción dinámico */}
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: hayCambioDePlan ? PALETTE.purpleVibrant : "#94A3B8" }]}
                onPress={procesarCambioDePlanYPago}
                disabled={procesandoPago}
                activeOpacity={0.85}
              >
                <Text style={styles.modalActionBtnText}>
                  {procesandoPago
                    ? "Procesando..."
                    : diferenciaPlan > 0
                    ? "Procesar pago"
                    : hayCambioDePlan
                    ? "Aceptar cambio"
                    : "Cerrar"}
                </Text>
              </TouchableOpacity>

              {/* Botón de Cancelar adicional si cambió de plan */}
              {hayCambioDePlan && (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalCambioPlanVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
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
              paciente: pacientes[0] || null,
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
            colors={[PALETTE.tealDeep, PALETTE.tealMid]}
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
          onPress={() => irAPantalla("AgendaPsicologo")}
        >
          <Ionicons name="calendar-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Ionicons name="qr-code" size={21} color={PALETTE.purpleVibrant} />
          <Text
            style={[
              styles.navLabel,
              { color: PALETTE.purpleVibrant, fontWeight: "800" },
            ]}
          >
            QR & $0
          </Text>
          <View
            style={[
              styles.activeNavIndicator,
              { backgroundColor: PALETTE.purpleVibrant },
            ]}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EDF6F8",
  },
  headerWrapper: {
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "#E2EEF2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    position: "relative",
  },
  decorBubbleLeft: {
    position: "absolute",
    top: -28,
    left: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(179, 211, 218, 0.25)",
  },
  decorBubbleRight: {
    position: "absolute",
    bottom: -35,
    right: 45,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(206, 199, 253, 0.28)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
    paddingRight: 8,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textDark,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  mobilePill: {
    backgroundColor: "#DCEEF2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
  },
  mobilePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.tealDeep,
  },
  doctorSubtitle: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "#E1EEF2",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 17,
    backgroundColor: "#F3EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: PALETTE.bgCanvas,
    flexGrow: 1,
    gap: 15,
  },
  titleBlock: {
    alignItems: "center",
    marginTop: 2,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: PALETTE.textDark,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.purpleVibrant,
    marginTop: 2,
  },
  qrMainCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4EFF3",
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  qrTopPill: {
    backgroundColor: "#F3EFFF",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 16,
  },
  qrTopPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
    letterSpacing: 0.5,
  },
  qrOuterFrame: {
    padding: 4,
    borderRadius: 28,
    shadowColor: PALETTE.purpleVibrant,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  qrInnerWhite: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2.5,
    borderColor: PALETTE.textDark,
  },
  qrCenterEmblem: {
    position: "absolute",
    top: 63,
    left: 63,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: PALETTE.purpleVibrant,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  codeCaption: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 16,
  },
  codeCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  codeHighlight: {
    fontSize: 28,
    fontWeight: "900",
    color: PALETTE.purpleVibrant,
    letterSpacing: 4,
  },
  copyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F6F2FF",
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copiedFeedback: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.tealDeep,
    marginTop: 3,
  },
  doctorVerifyText: {
    fontSize: 11.5,
    color: PALETTE.textMuted,
    marginTop: 6,
  },
  shareBtn: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F6F2FF",
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
    paddingVertical: 12,
    borderRadius: 16,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },
  flywheelCard: {
    borderRadius: 26,
    padding: 18,
    overflow: "hidden",
    position: "relative",
    shadowColor: PALETTE.indigoMuted,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  flywheelOrb: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  flywheelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flywheelGoldPill: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 999,
  },
  flywheelGoldText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#1E1B4B",
    letterSpacing: 0.4,
  },
  cuotaFinalText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#6EE7B7",
  },
  planActivoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  packageLabelActiveTitle: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  packageActiveName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  packageActiveSub: {
    fontSize: 10.5,
    color: "#E2E8F0",
    marginTop: 2,
  },
  upgradeBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PALETTE.purpleVibrant,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  upgradeBtnMiniText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  progressSection: {
    marginTop: 14,
    gap: 6,
  },
  progressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLeftLabel: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  progressRightLabel: {
    fontSize: 11.5,
    color: "#6EE7B7",
    fontWeight: "800",
  },
  progressTrackMulti: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    flexDirection: "row",
  },
  progressFillGreen: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  progressFillYellow: {
    height: "100%",
    backgroundColor: "#FACC15",
  },
  progressFootnote: {
    fontSize: 11,
    color: "#E2E8F0",
    lineHeight: 16,
    marginTop: 2,
  },
  commissionCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.tealSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  commissionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },
  commissionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#DCEEF2",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  commissionSub: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  toggleBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  toggleBarText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.purpleVibrant,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textDark,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  modalPlanItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 14,
  },
  modalPlanItemActive: {
    backgroundColor: "#F3EFFF",
    borderColor: PALETTE.purpleVibrant,
  },
  modalPlanName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  modalPlanDesc: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  modalPlanPrice: {
    fontSize: 13.5,
    fontWeight: "900",
    color: PALETTE.tealDeep,
  },
  avisoBajadaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  avisoBajadaText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },
  diferenciaBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  diferenciaTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  diferenciaValue: {
    fontSize: 18,
    fontWeight: "900",
    color: PALETTE.purpleVibrant,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginBottom: 6,
  },
  payMethodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  payMethodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  payMethodBtnActive: {
    backgroundColor: PALETTE.purpleVibrant,
    borderColor: PALETTE.purpleVibrant,
  },
  payMethodBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  payFormBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 8,
  },
  payInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    color: PALETTE.textDark,
  },
  modalActionBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  modalActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.cardWhite,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#E4EFF3",
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
    backgroundColor: PALETTE.tealDeep,
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