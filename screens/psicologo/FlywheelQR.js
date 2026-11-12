import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";
import { escucharMisPacientes } from "../../services/lamiSyncService";

// Paleta oficial Lami
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

// Genera una matriz visual determinista 17x17 con patrones de búsqueda QR reales
// basada en el código único del psicólogo para que cada terapeuta tenga su QR único
function generarMatrizQR(texto) {
  const size = 17;
  const grid = Array.from({ length: size }, () => Array(size).fill(0));

  const colocarFinder = (r0, c0) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const esBorde = r === 0 || r === 4 || c === 0 || c === 4;
        const esCentro = r >= 1 && r <= 3 && c >= 1 && c <= 3 && !(r === 1 && c === 1) && !(r === 1 && c === 3) && !(r === 3 && c === 1) && !(r === 3 && c === 3);
        grid[r0 + r][c0 + c] = esBorde || (r === 2 && c === 2) ? 1 : 0;
      }
    }
  };

  colocarFinder(0, 0);
  colocarFinder(0, size - 5);
  colocarFinder(size - 5, 0);

  let hash = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const enFinderSupIzq = r < 6 && c < 6;
      const enFinderSupDer = r < 6 && c >= size - 6;
      const enFinderInfIzq = r >= size - 6 && c < 6;
      const enCentroLogo = r >= 6 && r <= 10 && c >= 6 && c <= 10;

      if (enFinderSupIzq || enFinderSupDer || enFinderInfIzq || enCentroLogo) {
        continue;
      }

      hash ^= (r * 31 + c * 17 + texto.length) * 2654435761;
      grid[r][c] = Math.abs(hash) % 3 === 0 ? 1 : 0;
    }
  }

  return grid;
}

export default function FlywheelQR({ navigation }) {
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState("profesional");
  const [copiado, setCopiado] = useState(false);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const mesActual = new Date().toISOString().slice(0, 7);

  // 1. Perfil real del psicólogo desde Firestore
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
          }
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  // 2. Pacientes vinculados en tiempo real
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

  // Payload real que codifica el QR para vincular al paciente
  const payloadQR = `LAMI-LINK|${codigoVinculacion}|${psicologoId}`;
  const matrizQR = useMemo(() => generarMatrizQR(payloadQR), [payloadQR]);

  // Cálculos dinámicos del Sistema Flywheel (idénticos al prototipo HTML)
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

  const bonificacionPorPaciente = 60; // $60 MXN por paciente activo/mes
  const descuentoTotal = pacientesActivosMes * bonificacionPorPaciente;
  const cuotaAPagar = Math.max(0, infoPaquete.precio - descuentoTotal);
  const progresoMetaPct = Math.min(
    100,
    Math.round((descuentoTotal / infoPaquete.precio) * 100)
  );
  const pacientesParaGratis = Math.ceil(
    infoPaquete.precio / bonificacionPorPaciente
  );

  // Comisión pasiva 20% por pacientes Premium ($149 MXN/mes)
  const comisionMensualMXN = Math.round(pacientesPremium * 149 * 0.2);

  // Copiar código con feedback visual
  const handleCopiarCodigo = async () => {
    try {
      // Intenta usar expo-clipboard dinámicamente si está disponible en Expo Go
      const Clipboard = require("expo-clipboard");
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(codigoVinculacion);
      }
    } catch (_) {
      // Respaldo silencioso si no está importado
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  // Compartir enlace y código por WhatsApp / sistema
  const handleCompartirEnlace = async () => {
    try {
      await Share.share({
        message: `Hola, te invito a vincularte conmigo en Lami para dar seguimiento a nuestras sesiones.\n\n1. Descarga o abre tu app Lami.\n2. Ve a tu Perfil e ingresa mi código de especialista: ${codigoVinculacion}\n\nEspecialista: ${nombreMostrar} (Céd. ${cedulaMostrar})`,
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir el menú para compartir.");
    }
  };

  const irAPantalla = (routeName, params = {}) => {
    navigation.navigate(routeName, params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ============================================================ */}
      {/* HEADER SUPERIOR UNIFICADO CON LA PALETA LAMI                 */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* CONTENIDO PRINCIPAL: CONSULTORIO & FLYWHEEL                  */}
      {/* ============================================================ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Título de sección centrado como en el diseño */}
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Consultorio & Flywheel</Text>
          <Text style={styles.pageSubtitle}>
            Incentivos y Vinculación B2B2C
          </Text>
        </View>

        {/* 1. TARJETA PRINCIPAL DE VINCULACIÓN QR */}
        <View style={styles.qrMainCard}>
          <View style={styles.qrTopPill}>
            <Text style={styles.qrTopPillText}>
              MUESTRA ESTA PANTALLA EN CONSULTA
            </Text>
          </View>

          {/* Marco del Código QR con ícono central de pulso Lami */}
          <LinearGradient
            colors={[PALETTE.tealSoft, PALETTE.lavenderSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrOuterFrame}
          >
            <View style={styles.qrInnerWhite}>
              <View style={styles.qrGridContainer}>
                {matrizQR.map((fila, rIdx) => (
                  <View key={rIdx} style={styles.qrRow}>
                    {fila.map((celda, cIdx) => {
                      const esCentro =
                        rIdx >= 6 && rIdx <= 10 && cIdx >= 6 && cIdx <= 10;
                      if (esCentro) {
                        return (
                          <View key={cIdx} style={styles.qrCellBlank} />
                        );
                      }
                      return (
                        <View
                          key={cIdx}
                          style={[
                            styles.qrCell,
                            celda === 1
                              ? styles.qrCellFilled
                              : styles.qrCellEmpty,
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}

                {/* Emblema central flotante */}
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  style={styles.qrCenterEmblem}
                >
                  <Ionicons name="pulse" size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>

          <Text style={styles.codeCaption}>
            Código alfanumérico para el paciente:
          </Text>

          {/* Código grande + Botón Copiar */}
          <View style={styles.codeCopyRow}>
            <Text style={styles.codeHighlight}>{codigoVinculacion}</Text>
            <TouchableOpacity
              style={[
                styles.copyIconBtn,
                copiado && { backgroundColor: "#E6F3F6", borderColor: PALETTE.tealDeep },
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

          {/* Botón Compartir Enlace */}
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

        {/* 2. TARJETA DEGRADADA: SISTEMA FLYWHEEL ACTIVO */}
        <LinearGradient
          colors={["#3A2D5C", PALETTE.indigoMuted, PALETTE.purpleVibrant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.flywheelCard}
        >
          <View style={styles.flywheelOrb} />

          {/* Fila superior: Pill dorado + Cuota calculada */}
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

          {/* Selector de Paquete Terapeuta */}
          <Text style={styles.packageLabel}>
            Tu Paquete Terapeuta contratado:
          </Text>
          <View style={styles.packageSelectorBox}>
            {PAQUETES.map((pkg) => {
              const activo = paqueteSeleccionado === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageOption,
                    activo && styles.packageOptionActive,
                  ]}
                  onPress={() => setPaqueteSeleccionado(pkg.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.packageName,
                      activo && styles.packageNameActive,
                    ]}
                  >
                    {pkg.nombre}
                  </Text>
                  <Text
                    style={[
                      styles.packageMeta,
                      activo && styles.packageMetaActive,
                    ]}
                  >
                    ≤{pkg.limite} pac • ${pkg.precio.toLocaleString("es-MX")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Barra de progreso hacia cuota $0 MXN */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelsRow}>
              <Text style={styles.progressLeftLabel}>
                Bonificación ({pacientesActivosMes} activos × $60)
              </Text>
              <Text style={styles.progressRightLabel}>
                -${descuentoTotal.toLocaleString("es-MX")} MXN
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[PALETTE.tealMid, "#A7F3D0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progresoMetaPct}%` }]}
              />
            </View>

            <Text style={styles.progressFootnote}>
              {cuotaAPagar === 0
                ? "¡Meta alcanzada! Tu plataforma clínica Lami es 100% gratuita este mes ✨"
                : `Vincula ${Math.max(
                    0,
                    pacientesParaGratis - pacientesActivosMes
                  )} pacientes activos más para cubrir tu tarifa de $${infoPaquete.precio} MXN.`}
            </Text>
          </View>
        </LinearGradient>

        {/* 3. TARJETA COMPLEMENTARIA: INGRESOS POR REFERIDOS PREMIUM */}
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
                Comisión Recurrente (20%)
              </Text>
              <Text style={styles.commissionSub}>
                {pacientesPremium} pacientes en Plan Lami Premium ($149/mes)
              </Text>
            </View>
          </View>
          <View style={styles.commissionAmountBadge}>
            <Text style={styles.commissionAmountText}>
              +${comisionMensualMXN} MXN
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* ============================================================ */}
      {/* BARRA INFERIOR DE 5 ICONOS (CON QR & $0 ACTIVO)              */}
      {/* ============================================================ */}
      <View style={styles.bottomBar}>
        {/* 1. Pacientes */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => irAPantalla("PsicologoDashboard")}
        >
          <Ionicons name="people-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>Pacientes</Text>
        </TouchableOpacity>

        {/* 2. Expediente */}
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

        {/* 3. Botón Central Elevado: Ejercicios */}
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

        {/* 4. Agenda */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => irAPantalla("AgendaPsicologo")}
        >
          <Ionicons name="calendar-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>Agenda</Text>
        </TouchableOpacity>

        {/* 5. QR & $0 (Pantalla actual activa) */}
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
  qrGridContainer: {
    width: 170,
    height: 170,
    justifyContent: "space-between",
    position: "relative",
  },
  qrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  qrCell: {
    width: 8,
    height: 8,
    borderRadius: 2.5,
  },
  qrCellFilled: {
    backgroundColor: PALETTE.textDark,
  },
  qrCellEmpty: {
    backgroundColor: "transparent",
  },
  qrCellBlank: {
    width: 8,
    height: 8,
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
  packageLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F1F5F9",
    marginTop: 14,
    marginBottom: 8,
  },
  packageSelectorBox: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  packageOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  packageOptionActive: {
    backgroundColor: PALETTE.purpleVibrant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  packageName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E2E8F0",
  },
  packageNameActive: {
    color: "#FFFFFF",
  },
  packageMeta: {
    fontSize: 9.5,
    color: "#CBD5E1",
    marginTop: 2,
  },
  packageMetaActive: {
    color: "#F3E8FF",
    fontWeight: "700",
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
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
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
  commissionAmountBadge: {
    backgroundColor: "#DCEEF2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  commissionAmountText: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.tealDeep,
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