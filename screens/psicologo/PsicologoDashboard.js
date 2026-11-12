import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
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

export default function PsicologoDashboard({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all"); // all | urgente | atencion | estable
  const [modalAlertas, setModalAlertas] = useState(false);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const mesActual = new Date().toISOString().slice(0, 7);
  const hoyISO = new Date().toISOString().slice(0, 10);

  // Suscripción en tiempo real al perfil del psicólogo registrado en Firestore
  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubPerfil = onSnapshot(
      doc(db, "psicologos", auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setPerfilPsicologo(snap.data());
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  // Datos dinámicos del psicólogo desde RegistroPsicologo
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

  // Suscripción en tiempo real a los pacientes vinculados en Firestore
  useEffect(() => {
    const unsub = escucharMisPacientes(psicologoId, (lista) => {
      setPacientes(lista || []);
    });
    return () => unsub && unsub();
  }, [psicologoId]);

  // Normalización de pacientes desde Firestore
  const pacientesEnriquecidos = useMemo(() => {
    return pacientes.map((pac, idx) => {
      const estado =
        pac.estadoClinico ||
        (pac.ultimoAnimo !== undefined
          ? pac.ultimoAnimo <= 3
            ? "urgente"
            : pac.ultimoAnimo <= 5
            ? "atencion"
            : "estable"
          : "estable");

      const animo =
        pac.ultimoAnimo ??
        (estado === "urgente" ? 2 : estado === "atencion" ? 5 : 8);
      const tareasPct =
        pac.porcentajeTareas ?? (pac.activoEnMes === mesActual ? 85 : 25);

      return {
        ...pac,
        estadoClinico: estado,
        ultimoAnimo: animo,
        porcentajeTareas: tareasPct,
        sesionNum: pac.sesionActual || idx + 1,
        notaReciente:
          pac.ultimoCheckinNota ||
          (estado === "urgente"
            ? "Reportó episodio de ansiedad reciente"
            : pac.activoEnMes === mesActual
            ? "Check-in y ejercicios al día"
            : "Sin registros recientes"),
        horaUltimoCheckin: pac.horaUltimoCheckin || "Hoy",
      };
    });
  }, [pacientes, mesActual]);

  // Contadores de estado
  const conteos = useMemo(() => {
    return {
      all: pacientesEnriquecidos.length,
      urgente: pacientesEnriquecidos.filter((p) => p.estadoClinico === "urgente")
        .length,
      atencion: pacientesEnriquecidos.filter(
        (p) => p.estadoClinico === "atencion"
      ).length,
      estable: pacientesEnriquecidos.filter((p) => p.estadoClinico === "estable")
        .length,
    };
  }, [pacientesEnriquecidos]);

  // Filtrado por chip y búsqueda
  const pacientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pacientesEnriquecidos.filter((p) => {
      const coincideEstado =
        filtroEstado === "all" || p.estadoClinico === filtroEstado;
      const texto = `${p.nombre || ""} ${p.correo || ""} ${
        p.protocoloClinico || ""
      }`.toLowerCase();
      const coincideBusqueda = !q || texto.includes(q);
      return coincideEstado && coincideBusqueda;
    });
  }, [pacientesEnriquecidos, filtroEstado, busqueda]);

  // Métricas generales (Check-ins de HOY) y Flywheel (Activos del MES)
  const totalPacientes = pacientesEnriquecidos.length;
  const checkinsHoy = pacientesEnriquecidos.filter(
    (p) => p.ultimoCheckinFecha === hoyISO
  ).length;
  const pacientesActivosMes = pacientesEnriquecidos.filter(
    (p) => p.activoEnMes === mesActual
  ).length;
  const porcentajeParticipacion =
    totalPacientes > 0 ? Math.round((checkinsHoy / totalPacientes) * 100) : 0;

  const metaGratis = 10;
  const porcentajeDescuento = Math.min(
    100,
    Math.round((pacientesActivosMes / metaGratis) * 100)
  );
  const cuotaActual = Math.max(
    0,
    Math.round(599 * (1 - porcentajeDescuento / 100))
  );

  // Navegación segura hacia pantallas independientes
  const irAPantalla = (routeName, params = {}) => {
    navigation.navigate(routeName, params);
  };

  // Estilos semánticos armonizados con la paleta Lami
  const getEstadoConfig = (estado) => {
    if (estado === "urgente") {
      return {
        label: "Alerta",
        badgeBg: "#FEE2E2",
        badgeText: "#B91C1C",
        dotColor: "#EF4444",
        accentBar: "#F87171",
        borderColor: "#FECACA",
        scoreColor: "#DC2626",
        emoji: "😰",
        icon: "chatbubble-ellipses-outline",
        pillBg: "#FEF2F2",
        pillText: "#B91C1C",
      };
    }
    if (estado === "atencion") {
      return {
        label: "Atención",
        badgeBg: "#FEF3C7",
        badgeText: "#B45309",
        dotColor: "#F59E0B",
        accentBar: "#FBBF24",
        borderColor: "#FDE68A",
        scoreColor: "#D97706",
        emoji: "😐",
        icon: "time-outline",
        pillBg: "#FFFBEB",
        pillText: "#B45309",
      };
    }
    return {
      label: "Estable",
      badgeBg: "#E6F3F6",
      badgeText: PALETTE.tealDeep,
      dotColor: PALETTE.tealDeep,
      accentBar: PALETTE.tealMid,
      borderColor: PALETTE.tealSoft,
      scoreColor: PALETTE.tealDeep,
      emoji: "😊",
      icon: "checkmark-circle-outline",
      pillBg: "#EDF6F8",
      pillText: PALETTE.tealDeep,
    };
  };

  const pacientePrioritario =
    pacientesEnriquecidos.find((p) => p.estadoClinico === "urgente") ||
    pacientesEnriquecidos[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ============================================================ */}
      {/* HEADER SUPERIOR SERENO CON DESTELLOS DE PALETA               */}
      {/* ============================================================ */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={["#EDF6F8", "#F5F2FF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Burbujas decorativas suaves */}
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
                Céd. {cedulaMostrar} • {perfilPsicologo?.especialidad || "Lami Clínico"}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Campana de Alertas */}
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => setModalAlertas(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={PALETTE.tealDeep}
              />
              {conteos.urgente > 0 && <View style={styles.alertDot} />}
            </TouchableOpacity>

            {/* Salir */}
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => navigation.replace("Login")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={PALETTE.tealDeep}
              />
            </TouchableOpacity>

            {/* Avatar con aro degradado #A374CC -> #7E83C2 */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => irAPantalla("FlywheelQR")}
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
      {/* CUERPO SCROLLEABLE: SOLO PANTALLA DE PACIENTES               */}
      {/* ============================================================ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TARJETA HERO: PRÓXIMA TELECONSULTA */}
        <LinearGradient
          colors={[PALETTE.tealDeep, PALETTE.tealMid, PALETTE.indigoMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.teleconsultaBanner}
        >
          {/* Círculos translúcidos internos para profundidad visual */}
          <View style={styles.bannerOrbOne} />
          <View style={styles.bannerOrbTwo} />

          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={styles.teleBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.teleBadgeText}>
                PRÓXIMA TELECONSULTA • EN VIVO
              </Text>
            </View>

            <Text style={styles.telePatientTitle} numberOfLines={1}>
              {pacientePrioritario
                ? `${
                    pacientePrioritario.nombre || "Paciente Lami"
                  } • Sesión #${pacientePrioritario.sesionNum}`
                : "Sala de Consulta Lista"}
            </Text>

            <Text style={styles.teleSubtitle} numberOfLines={1}>
              {pacientePrioritario
                ? `Seguimiento ${
                    pacientePrioritario.protocoloClinico || "Ansiedad"
                  }`
                : "Comparte tu código QR para vincular pacientes"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.9}
            onPress={() => {
              irAPantalla("SalaTeleconsulta", {
                paciente: pacientePrioritario || null,
              });
            }}
          >
            <View style={styles.camIconCircle}>
              <Ionicons
                name="videocam"
                size={13}
                color={PALETTE.purpleVibrant}
              />
            </View>
            <Text style={styles.joinBtnText}>Unirse</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* 2. BARRA DE BÚSQUEDA SUAVE */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconBadge}>
            <Ionicons
              name="search-outline"
              size={16}
              color={PALETTE.tealDeep}
            />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar paciente o motivo..."
            placeholderTextColor="#94A3B8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={PALETTE.tealMid}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* 3. CHIPS DE FILTRO RÁPIDO */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {[
            { key: "all", label: `Todos (${conteos.all})` },
            { key: "urgente", label: `🚨 Alerta (${conteos.urgente})` },
            { key: "atencion", label: `⚠️ Atención (${conteos.atencion})` },
            { key: "estable", label: `🌱 Estables (${conteos.estable})` },
          ].map((chip) => {
            const active = filtroEstado === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                activeOpacity={0.85}
                onPress={() => setFiltroEstado(chip.key)}
              >
                {active ? (
                  <LinearGradient
                    colors={[PALETTE.tealDeep, PALETTE.tealMid]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterChipActive}
                  >
                    <Text style={styles.filterChipTextActive}>
                      {chip.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterChipInactive}>
                    <Text style={styles.filterChipTextInactive}>
                      {chip.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. MICRO-TARJETAS DE RESUMEN (Check-ins Hoy + Flywheel Activo) */}
        <View style={styles.microGrid}>
          {/* Tarjeta Check-ins Hoy */}
          <LinearGradient
            colors={["#FFFFFF", "#EDF6F8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.microCard}
          >
            <View style={styles.microTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.microLabel}>Check-ins Hoy</Text>
                <Text style={styles.microValue}>
                  {checkinsHoy} de {totalPacientes}
                </Text>
              </View>
              <View
                style={[
                  styles.microIconBox,
                  { backgroundColor: "#E1F0F4" },
                ]}
              >
                <Ionicons
                  name="heart-outline"
                  size={19}
                  color={PALETTE.tealDeep}
                />
              </View>
            </View>

            {/* Barra de progreso suave */}
            <View style={styles.miniProgressTrack}>
              <LinearGradient
                colors={[PALETTE.tealDeep, PALETTE.tealMid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.miniProgressFill,
                  { width: `${porcentajeParticipacion}%` },
                ]}
              />
            </View>
            <Text style={styles.microSubTeal}>
              {porcentajeParticipacion}% participación
            </Text>
          </LinearGradient>

          {/* Tarjeta Flywheel Activo */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.88}
            onPress={() => irAPantalla("FlywheelQR")}
          >
            <LinearGradient
              colors={["#FAF8FF", "#EFEAFE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.microCard, styles.microCardFlywheel]}
            >
              <View style={styles.microTopRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.microLabel,
                      { color: PALETTE.purpleVibrant, fontWeight: "700" },
                    ]}
                  >
                    Flywheel Activo
                  </Text>
                  <Text style={styles.microValue}>${cuotaActual} MXN</Text>
                </View>
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  style={styles.microIconBox}
                >
                  <Ionicons name="qr-code" size={17} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Barra de progreso Flywheel */}
              <View
                style={[
                  styles.miniProgressTrack,
                  { backgroundColor: "#E4DCFD" },
                ]}
              >
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.miniProgressFill,
                    { width: `${porcentajeDescuento}%` },
                  ]}
                />
              </View>
              <Text style={styles.microSubPurple}>
                {pacientesActivosMes} activos •{" "}
                {cuotaActual === 0 ? "Meta OK ✨" : `Meta ${metaGratis}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Encabezado sutil de sección */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Seguimiento de Pacientes</Text>
          <View style={styles.syncPill}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>En tiempo real</Text>
          </View>
        </View>

        {/* 5. TARJETAS DE PACIENTES CONECTADAS A FIRESTORE */}
        {pacientesFiltrados.length === 0 ? (
          <LinearGradient
            colors={["#FFFFFF", "#F3F8FA"]}
            style={styles.emptyStateCard}
          >
            <LinearGradient
              colors={[PALETTE.tealSoft, PALETTE.lavenderSoft]}
              style={styles.emptyIconCircle}
            >
              <Ionicons
                name="people-outline"
                size={28}
                color={PALETTE.textDark}
              />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {totalPacientes === 0
                ? "Aún no tienes pacientes vinculados"
                : "Sin coincidencias para este filtro"}
            </Text>
            <Text style={styles.emptyBody}>
              {totalPacientes === 0
                ? `Muestra tu código ${codigoVinculacion} en consulta para que tus pacientes se conecten desde su app Lami.`
                : "Prueba cambiando el filtro superior o limpia la barra de búsqueda."}
            </Text>
            {totalPacientes === 0 && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => irAPantalla("FlywheelQR")}
              >
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyActionBtn}
                >
                  <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyActionBtnText}>
                    Mostrar mi código QR
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>
        ) : (
          pacientesFiltrados.map((pac) => {
            const cfg = getEstadoConfig(pac.estadoClinico);
            const iniciales = (pac.nombre || pac.correo || "PL")
              .slice(0, 2)
              .toUpperCase();

            return (
              <TouchableOpacity
                key={pac.uid}
                activeOpacity={0.86}
                onPress={() =>
                  irAPantalla("ExpedientePaciente", { paciente: pac })
                }
                style={[
                  styles.patientCard,
                  { borderColor: cfg.borderColor },
                ]}
              >
                {/* Franja vertical lateral orgánica */}
                <View
                  style={[
                    styles.cardSideAccent,
                    { backgroundColor: cfg.accentBar },
                  ]}
                />

                <View style={{ flex: 1 }}>
                  {/* Fila superior */}
                  <View style={styles.patientTopRow}>
                    <View style={styles.patientIdentity}>
                      <View style={styles.patientAvatarWrapper}>
                        {pac.fotoUrl ? (
                          <Image
                            source={{ uri: pac.fotoUrl }}
                            style={[
                              styles.patientAvatar,
                              pac.estadoClinico === "urgente" && {
                                borderWidth: 2,
                                borderColor: "#F87171",
                              },
                            ]}
                          />
                        ) : (
                          <LinearGradient
                            colors={[PALETTE.tealSoft, PALETTE.lavenderSoft]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.patientAvatarFallback}
                          >
                            <Text style={styles.patientAvatarInitials}>
                              {iniciales}
                            </Text>
                          </LinearGradient>
                        )}
                        <View
                          style={[
                            styles.statusCornerDot,
                            { backgroundColor: cfg.dotColor },
                          ]}
                        >
                          {pac.estadoClinico === "urgente" && (
                            <Text style={styles.exclamationText}>!</Text>
                          )}
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.nameBadgeRow}>
                          <Text style={styles.patientName} numberOfLines={1}>
                            {pac.nombre || pac.correo || "Paciente Lami"}
                          </Text>
                          <View
                            style={[
                              styles.stateBadge,
                              { backgroundColor: cfg.badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stateBadgeText,
                                { color: cfg.badgeText },
                              ]}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.patientDx} numberOfLines={1}>
                          {pac.protocoloClinico || "Ansiedad"} • Sesión #
                          {pac.sesionNum}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[styles.scoreText, { color: cfg.scoreColor }]}
                      >
                        {pac.ultimoAnimo}/10 {cfg.emoji}
                      </Text>
                      <Text style={styles.timeText}>
                        {pac.horaUltimoCheckin}
                      </Text>
                    </View>
                  </View>

                  {/* Fila inferior */}
                  <View style={styles.patientBottomRow}>
                    <View style={styles.contextSnippetRow}>
                      <Ionicons
                        name={cfg.icon}
                        size={14}
                        color={cfg.scoreColor}
                      />
                      <Text style={styles.contextSnippetText} numberOfLines={1}>
                        {pac.notaReciente}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tasksPill,
                        { backgroundColor: cfg.pillBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tasksPillText,
                          { color: cfg.pillText },
                        ]}
                      >
                        {pac.porcentajeTareas}% tareas
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* BARRA INFERIOR DE 5 ICONOS -> DIRECCIONAN A CADA PANTALLA    */}
      {/* ============================================================ */}
      <View style={styles.bottomBar}>
        {/* 1. Pacientes (Pantalla actual activa) */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Ionicons name="people" size={21} color={PALETTE.tealDeep} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>
            Pacientes
          </Text>
          <View style={styles.activeNavIndicator} />
        </TouchableOpacity>

        {/* 2. Expediente */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() =>
            irAPantalla("ExpedientePaciente", {
              paciente: pacientePrioritario || null,
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

        {/* 5. QR & $0 */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => irAPantalla("FlywheelQR")}
        >
          <Ionicons name="qr-code-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>QR & $0</Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* MODAL DE ALERTAS CLÍNICAS INTERSESIÓN                        */}
      {/* ============================================================ */}
      <Modal visible={modalAlertas} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalBellBadge}>
                  <Ionicons
                    name="notifications"
                    size={16}
                    color={PALETTE.purpleVibrant}
                  />
                </View>
                <Text style={styles.modalTitle}>Alertas Intersesión</Text>
              </View>
              <TouchableOpacity onPress={() => setModalAlertas(false)}>
                <Ionicons name="close" size={22} color={PALETTE.textMuted} />
              </TouchableOpacity>
            </View>

            {pacientesEnriquecidos.filter((p) => p.estadoClinico === "urgente")
              .length === 0 ? (
              <View style={styles.noAlertsBox}>
                <Ionicons
                  name="sparkles-outline"
                  size={24}
                  color={PALETTE.tealDeep}
                />
                <Text style={styles.emptyBody}>
                  Todo en calma. No hay alertas críticas activas en este momento.
                </Text>
              </View>
            ) : (
              pacientesEnriquecidos
                .filter((p) => p.estadoClinico === "urgente")
                .map((p) => (
                  <TouchableOpacity
                    key={p.uid}
                    style={styles.alertItemBox}
                    onPress={() => {
                      setModalAlertas(false);
                      irAPantalla("ExpedientePaciente", { paciente: p });
                    }}
                  >
                    <Text style={styles.alertItemTitle}>
                      🚨 {p.nombre || "Paciente"} • Ánimo {p.ultimoAnimo}/10
                    </Text>
                    <Text style={styles.alertItemBody}>{p.notaReciente}</Text>
                  </TouchableOpacity>
                ))
            )}
          </View>
        </View>
      </Modal>
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
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
    position: "relative",
  },
  alertDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
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
    gap: 14,
  },
  teleconsultaBanner: {
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerOrbOne: {
    position: "absolute",
    top: -25,
    right: 65,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  bannerOrbTwo: {
    position: "absolute",
    bottom: -35,
    left: 20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(206, 199, 253, 0.16)",
  },
  teleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    marginBottom: 7,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FEF08A",
  },
  teleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  telePatientTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  teleSubtitle: {
    fontSize: 11.5,
    color: "#F1F8FA",
    marginTop: 2,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 9.5,
    borderRadius: 15,
    gap: 6,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  camIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "#F3EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.tealDeep,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#DCEBF0",
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EDF6F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.textDark,
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterChipActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipInactive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.cardWhite,
    borderWidth: 1,
    borderColor: "#DCEBF0",
  },
  filterChipTextActive: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  filterChipTextInactive: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  microGrid: {
    flexDirection: "row",
    gap: 11,
  },
  microCard: {
    flex: 1,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: PALETTE.tealSoft,
    justifyContent: "space-between",
    gap: 7,
  },
  microCardFlywheel: {
    borderColor: PALETTE.lavenderSoft,
  },
  microTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  microLabel: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
  microValue: {
    fontSize: 17,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginTop: 1,
  },
  miniProgressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DCECF1",
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  microSubTeal: {
    fontSize: 10,
    fontWeight: "700",
    color: PALETTE.tealDeep,
  },
  microSubPurple: {
    fontSize: 10,
    fontWeight: "700",
    color: PALETTE.indigoMuted,
  },
  microIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 2,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDF6F8",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.tealDeep,
  },
  syncText: {
    fontSize: 10,
    fontWeight: "700",
    color: PALETTE.tealDeep,
  },
  patientCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 22,
    padding: 14,
    paddingLeft: 17,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSideAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  patientTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  patientIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 11,
    paddingRight: 8,
  },
  patientAvatarWrapper: {
    position: "relative",
  },
  patientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
  },
  patientAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  statusCornerDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  exclamationText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: PALETTE.textDark,
    flexShrink: 1,
  },
  stateBadge: {
    paddingHorizontal: 7.5,
    paddingVertical: 2,
    borderRadius: 7,
  },
  stateBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  patientDx: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 3,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "800",
  },
  timeText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  patientBottomRow: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  contextSnippetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  contextSnippetText: {
    fontSize: 11,
    color: PALETTE.textMuted,
    flex: 1,
  },
  tasksPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  tasksPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: PALETTE.tealSoft,
    gap: 9,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 12,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
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
    shadowColor: PALETTE.tealDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  navLabelActive: {
    color: PALETTE.tealDeep,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: PALETTE.cardWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.tealSoft,
    alignSelf: "center",
    marginBottom: 2,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalBellBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  noAlertsBox: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  alertItemBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 13,
    gap: 4,
  },
  alertItemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B91C1C",
  },
  alertItemBody: {
    fontSize: 12,
    color: PALETTE.textDark,
  },
});