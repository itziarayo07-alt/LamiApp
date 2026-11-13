import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PsicologoDashboard({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [modalAlertas, setModalAlertas] = useState(false);

  const [solicitudesSesion, setSolicitudesSesion] = useState([]);
  const [solicitudRespondendo, setSolicitudRespondendo] = useState(null);
  const [tipoRespuesta, setTipoRespuesta] = useState("aceptar");
  const [fechaPropuesta, setFechaPropuesta] = useState(getTomorrowISO());
  const [horaPropuesta, setHoraPropuesta] = useState("10:00 AM");
  const [modalidadPropuesta, setModalidadPropuesta] = useState("presencial");
  const [mensajeRespuesta, setMensajeRespuesta] = useState("");
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);

  const [resenasLista, setResenasLista] = useState([]);
  const [modalResenas, setModalResenas] = useState(false);

  const [modalUbicacion, setModalUbicacion] = useState(false);
  const [editTipoLugar, setEditTipoLugar] = useState("consultorio_privado");
  const [editNombreLugar, setEditNombreLugar] = useState("");
  const [editCiudad, setEditCiudad] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editPiso, setEditPiso] = useState("");
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const mesActual = new Date().toISOString().slice(0, 7);
  const hoyISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubPerfil = onSnapshot(
      doc(db, "psicologos", auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPerfilPsicologo(data);
          if (data.ubicacion) {
            setEditTipoLugar(
              data.ubicacion.tipoLugar || "consultorio_privado"
            );
            setEditNombreLugar(data.ubicacion.nombreLugar || "");
            setEditCiudad(data.ubicacion.ciudad || "");
            setEditDireccion(data.ubicacion.direccion || "");
            setEditPiso(data.ubicacion.pisoConsultorio || "");
          }
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const qSol = query(
      collection(db, "solicitudes_sesion"),
      where("psicologoId", "==", auth.currentUser.uid)
    );
    const unsubSol = onSnapshot(qSol, (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setSolicitudesSesion(lista);
    });
    return () => unsubSol();
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubRes = onSnapshot(
      collection(db, "psicologos", auth.currentUser.uid, "resenas"),
      (snap) => {
        const lista = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0)
          );
        setResenasLista(lista);
      }
    );
    return () => unsubRes();
  }, []);

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

  const totalResenas =
    resenasLista.length > 0
      ? resenasLista.length
      : Number(perfilPsicologo?.totalResenas || 0);
  const promedioEstrellas =
    resenasLista.length > 0
      ? (
          resenasLista.reduce(
            (acc, item) => acc + Number(item.calificacion || 0),
            0
          ) / resenasLista.length
        ).toFixed(1)
      : totalResenas > 0
      ? Number(perfilPsicologo?.calificacionPromedio || 0).toFixed(1)
      : "0.0";

  useEffect(() => {
    const unsub = escucharMisPacientes(psicologoId, (lista) => {
      setPacientes(lista || []);
    });
    return () => unsub && unsub();
  }, [psicologoId]);

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

  const solicitudesPendientes = useMemo(
    () =>
      solicitudesSesion.filter(
        (s) =>
          s.estado === "pendiente" || s.estado === "reprogramacion_solicitada"
      ),
    [solicitudesSesion]
  );

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

  const totalPacientes = pacientesEnriquecidos.length;
  const checkinsHoy = pacientesEnriquecidos.filter(
    (p) => p.ultimoCheckinFecha === hoyISO
  ).length;
  const porcentajeParticipacion =
    totalPacientes > 0 ? Math.round((checkinsHoy / totalPacientes) * 100) : 0;

  const irAPantalla = (routeName, params = {}) => {
    navigation.navigate(routeName, params);
  };

  const handleResponderSolicitud = async () => {
    if (!solicitudRespondendo) return;

    try {
      setEnviandoRespuesta(true);

      if (tipoRespuesta === "sin_cupo") {
        await updateDoc(
          doc(db, "solicitudes_sesion", solicitudRespondendo.id),
          {
            estado: "sin_disponibilidad",
            respuestaTerapeuta:
              mensajeRespuesta.trim() ||
              "Por el momento no cuento con disponibilidad en ese horario. Te avisaré en cuanto se abra un espacio.",
            respondidoEn: serverTimestamp(),
          }
        );
        Alert.alert(
          "Respuesta enviada",
          "Se notificó al paciente que por ahora no hay disponibilidad."
        );
      } else {
        const esPresencial = modalidadPropuesta === "presencial";
        const ubicacionParaEnviar = esPresencial
          ? perfilPsicologo?.ubicacion || null
          : null;

        if (esPresencial && !ubicacionParaEnviar?.direccion) {
          Alert.alert(
            "Configura tu dirección primero",
            "Como aceptaste una cita presencial, agrega la dirección de tu consultorio para que el paciente sepa dónde llegar."
          );
          setEnviandoRespuesta(false);
          setModalAlertas(false);
          setModalUbicacion(true);
          return;
        }

        await updateDoc(
          doc(db, "solicitudes_sesion", solicitudRespondendo.id),
          {
            estado: "confirmada",
            fechaCita: fechaPropuesta.trim() || getTomorrowISO(),
            horaCita: horaPropuesta.trim() || "10:00 AM",
            modalidadConfirmada: modalidadPropuesta,
            ubicacionConfirmada: ubicacionParaEnviar,
            respuestaTerapeuta:
              mensajeRespuesta.trim() ||
              `¡Hola! Con gusto te recibo. Acepta la cita para agregarla a tu calendario y vincularnos (código ${codigoVinculacion}).`,
            respondidoEn: serverTimestamp(),
          }
        );

        Alert.alert(
          "Cita confirmada ✨",
          esPresencial
            ? "Se envió tu invitación y la ubicación exacta de tu consultorio al paciente."
            : "Se envió tu invitación de videollamada al paciente."
        );
      }

      setSolicitudRespondendo(null);
      setMensajeRespuesta("");
    } catch (err) {
      Alert.alert("Error", "No se pudo responder la solicitud: " + err.message);
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  const handleGuardarUbicacion = async () => {
    if (!auth.currentUser?.uid) return;
    if (!editCiudad.trim() || !editDireccion.trim()) {
      Alert.alert(
        "Datos incompletos",
        "Escribe al menos la ciudad y la dirección de tu consultorio."
      );
      return;
    }

    try {
      setGuardandoUbicacion(true);
      const nuevaUbicacion = {
        tipoLugar: editTipoLugar,
        nombreLugar:
          editTipoLugar === "hospital_clinica"
            ? editNombreLugar.trim() || "Clínica / Hospital"
            : editNombreLugar.trim() || "Consultorio privado independiente",
        ciudad: editCiudad.trim(),
        ciudadKey: editCiudad
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
        direccion: editDireccion.trim(),
        pisoConsultorio: editPiso.trim(),
      };

      await updateDoc(doc(db, "psicologos", auth.currentUser.uid), {
        ubicacion: nuevaUbicacion,
      });

      setModalUbicacion(false);
      Alert.alert(
        "Ubicación guardada",
        "Tu dirección permanece privada y solo se revelará cuando aceptes una cita presencial."
      );
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la ubicación: " + e.message);
    } finally {
      setGuardandoUbicacion(false);
    }
  };

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

  const hayNotificacionesPendientes =
    conteos.urgente > 0 || solicitudesPendientes.length > 0;

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
                Céd. {cedulaMostrar} •{" "}
                {perfilPsicologo?.especialidad || "Lami Clínico"}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
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
              {hayNotificacionesPendientes && <View style={styles.alertDot} />}
            </TouchableOpacity>

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[PALETTE.tealDeep, PALETTE.tealMid, PALETTE.indigoMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.teleconsultaBanner}
        >
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

        {solicitudesPendientes.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setModalAlertas(true)}
            style={styles.solicitudesAlertBanner}
          >
            <View style={styles.solicitudesIconBox}>
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.solicitudesBannerTitle}>
                {solicitudesPendientes.length === 1
                  ? "1 solicitud de sesión pendiente"
                  : `${solicitudesPendientes.length} solicitudes de sesión pendientes`}
              </Text>
              <Text style={styles.solicitudesBannerSub}>
                Toca aquí para revisar y responder disponibilidad
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0F766E" />
          </TouchableOpacity>
        )}

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

        <View style={styles.microGrid}>
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
                style={[styles.microIconBox, { backgroundColor: "#E1F0F4" }]}
              >
                <Ionicons
                  name="heart-outline"
                  size={19}
                  color={PALETTE.tealDeep}
                />
              </View>
            </View>

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

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.88}
            onPress={() => setModalResenas(true)}
          >
            <LinearGradient
              colors={["#FFFBEB", "#FEF3C7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.microCard, { borderColor: "#FDE68A" }]}
            >
              <View style={styles.microTopRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.microLabel,
                      { color: "#B45309", fontWeight: "700" },
                    ]}
                  >
                    Mis Reseñas
                  </Text>
                  <Text style={styles.microValue}>⭐ {promedioEstrellas}</Text>
                </View>
                <View
                  style={[styles.microIconBox, { backgroundColor: "#FDE68A" }]}
                >
                  <Ionicons name="star" size={18} color="#B45309" />
                </View>
              </View>

              <Text style={{ fontSize: 11, color: "#92400E", fontWeight: "700" }}>
                {totalResenas}{" "}
                {totalResenas === 1
                  ? "comentario recibido"
                  : "comentarios recibidos"}
              </Text>
              <Text style={{ fontSize: 10, color: "#B45309", fontWeight: "600" }}>
                Toca para leer reseñas →
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setModalUbicacion(true)}
          style={styles.ubicacionConfigCard}
        >
          <View style={styles.ubicacionIconCircle}>
            <Ionicons name="location-outline" size={18} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ubicacionConfigTitle}>
              {perfilPsicologo?.ubicacion?.ciudad
                ? `${perfilPsicologo.ubicacion.nombreLugar} • ${perfilPsicologo.ubicacion.ciudad}`
                : "Configurar dirección de consultorio"}
            </Text>
            <Text style={styles.ubicacionConfigSub} numberOfLines={1}>
              {perfilPsicologo?.ubicacion?.direccion
                ? `${perfilPsicologo.ubicacion.direccion} (Privada hasta confirmar cita)`
                : "Agrega tu dirección privada para citas presenciales"}
            </Text>
          </View>
          <Ionicons name="create-outline" size={18} color="#6366F1" />
        </TouchableOpacity>

        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Seguimiento de Pacientes</Text>
          <View style={styles.syncPill}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>En tiempo real</Text>
          </View>
        </View>

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
                style={[styles.patientCard, { borderColor: cfg.borderColor }]}
              >
                <View
                  style={[
                    styles.cardSideAccent,
                    { backgroundColor: cfg.accentBar },
                  ]}
                />

                <View style={{ flex: 1 }}>
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

                    <TouchableOpacity
                      style={[
                        styles.tasksPill,
                        {
                          backgroundColor: "#EDE9FE",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        },
                      ]}
                      onPress={() =>
                        irAPantalla("EjerciciosPsicologo", { paciente: pac })
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={13}
                        color="#5B21B6"
                      />
                      <Text
                        style={[styles.tasksPillText, { color: "#5B21B6" }]}
                      >
                        Personalizar ejercicios
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
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
          onPress={() => irAPantalla("FlywheelQR")}
        >
          <Ionicons name="qr-code-outline" size={21} color="#94A3B8" />
          <Text style={styles.navLabel}>QR & $0</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalAlertas}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAlertas(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "88%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={styles.modalBellBadge}>
                  <Ionicons
                    name="notifications"
                    size={16}
                    color={PALETTE.purpleVibrant}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  Centro de Notificaciones
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSolicitudRespondendo(null);
                  setModalAlertas(false);
                }}
              >
                <Ionicons name="close" size={22} color={PALETTE.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            >
              {solicitudRespondendo ? (
                <View style={styles.respondCard}>
                  <TouchableOpacity
                    onPress={() => setSolicitudRespondendo(null)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={16}
                      color={PALETTE.tealDeep}
                    />
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: PALETTE.tealDeep,
                      }}
                    >
                      Volver a notificaciones
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.respondTitle}>
                    Solicitud de {solicitudRespondendo.pacienteNombre}
                  </Text>
                  <Text style={styles.respondQuote}>
                    "{solicitudRespondendo.mensaje}" (Modalidad preferida:{" "}
                    {solicitudRespondendo.modalidadSolicitada})
                  </Text>

                  <View style={styles.respondTypeRow}>
                    <TouchableOpacity
                      onPress={() => setTipoRespuesta("aceptar")}
                      style={[
                        styles.respondTypeBtn,
                        tipoRespuesta === "aceptar" &&
                          styles.respondTypeBtnAccept,
                      ]}
                    >
                      <Text
                        style={[
                          styles.respondTypeText,
                          tipoRespuesta === "aceptar" && { color: "#FFFFFF" },
                        ]}
                      >
                        Aceptar y agendar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setTipoRespuesta("sin_cupo")}
                      style={[
                        styles.respondTypeBtn,
                        tipoRespuesta === "sin_cupo" &&
                          styles.respondTypeBtnReject,
                      ]}
                    >
                      <Text
                        style={[
                          styles.respondTypeText,
                          tipoRespuesta === "sin_cupo" && { color: "#FFFFFF" },
                        ]}
                      >
                        Sin disponibilidad
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {tipoRespuesta === "aceptar" && (
                    <>
                      <Text style={styles.respondLabel}>
                        Fecha propuesta (AAAA-MM-DD)
                      </Text>
                      <TextInput
                        style={styles.respondInput}
                        value={fechaPropuesta}
                        onChangeText={setFechaPropuesta}
                        placeholder="2026-11-15"
                      />

                      <Text style={styles.respondLabel}>Hora de la cita</Text>
                      <TextInput
                        style={styles.respondInput}
                        value={horaPropuesta}
                        onChangeText={setHoraPropuesta}
                        placeholder="10:00 AM"
                      />

                      <Text style={styles.respondLabel}>
                        Modalidad confirmada
                      </Text>
                      <View style={styles.respondTypeRow}>
                        {[
                          ["presencial", "Presencial (revela dirección)"],
                          ["online", "Online (videollamada)"],
                        ].map(([val, lbl]) => (
                          <TouchableOpacity
                            key={val}
                            onPress={() => setModalidadPropuesta(val)}
                            style={[
                              styles.respondTypeBtn,
                              modalidadPropuesta === val && {
                                backgroundColor: "#4F46E5",
                                borderColor: "#4F46E5",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.respondTypeText,
                                modalidadPropuesta === val && {
                                  color: "#FFFFFF",
                                },
                              ]}
                            >
                              {lbl}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={styles.respondLabel}>
                    Mensaje para el paciente
                  </Text>
                  <TextInput
                    style={[styles.respondInput, { minHeight: 70 }]}
                    multiline
                    value={mensajeRespuesta}
                    onChangeText={setMensajeRespuesta}
                    placeholder="Envía mensaje..."
                    placeholderTextColor="#94A3B8"
                  />

                  <TouchableOpacity
                    disabled={enviandoRespuesta}
                    onPress={handleResponderSolicitud}
                    style={{ marginTop: 10 }}
                  >
                    <LinearGradient
                      colors={
                        tipoRespuesta === "aceptar"
                          ? ["#0D9488", "#0284C7"]
                          : ["#E11D48", "#BE123C"]
                      }
                      style={styles.respondSubmitBtn}
                    >
                      <Text style={styles.respondSubmitText}>
                        {enviandoRespuesta
                          ? "Enviando..."
                          : tipoRespuesta === "aceptar"
                          ? "Confirmar cita y enviar invitación"
                          : "Enviar aviso de disponibilidad"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.notifSectionTitle}>
                    Solicitudes de sesión ({solicitudesPendientes.length})
                  </Text>

                  {solicitudesPendientes.length === 0 ? (
                    <Text style={styles.notifEmptySub}>
                      No tienes solicitudes nuevas pendientes de responder.
                    </Text>
                  ) : (
                    solicitudesPendientes.map((sol) => (
                      <View key={sol.id} style={styles.solItemCard}>
                        <View style={styles.solItemTop}>
                          <Text style={styles.solPacienteName}>
                            🩺 {sol.pacienteNombre}
                          </Text>
                          <View style={styles.solModPill}>
                            <Text style={styles.solModText}>
                              {sol.modalidadSolicitada}
                            </Text>
                          </View>
                        </View>
                        {sol.estado === "reprogramacion_solicitada" && (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              color: "#4F46E5",
                            }}
                          >
                            🔄 El paciente solicitó cambiar el horario
                            propuesto:
                          </Text>
                        )}
                        <Text style={styles.solMensajeText}>
                          "{sol.mensaje}"
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSolicitudRespondendo(sol);
                            setTipoRespuesta("aceptar");
                            setModalidadPropuesta(
                              sol.modalidadSolicitada === "online"
                                ? "online"
                                : "presencial"
                            );
                          }}
                          style={styles.solActionBtn}
                        >
                          <Text style={styles.solActionBtnText}>
                            Responder / Agendar cita
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  <Text style={[styles.notifSectionTitle, { marginTop: 8 }]}>
                    Alertas clínicas intersesión ({conteos.urgente})
                  </Text>

                  {pacientesEnriquecidos.filter(
                    (p) => p.estadoClinico === "urgente"
                  ).length === 0 ? (
                    <View style={styles.noAlertsBox}>
                      <Ionicons
                        name="sparkles-outline"
                        size={22}
                        color={PALETTE.tealDeep}
                      />
                      <Text style={styles.emptyBody}>
                        Todo en calma. No hay alertas críticas activas en este
                        momento.
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
                            🚨 {p.nombre || "Paciente"} • Ánimo {p.ultimoAnimo}
                            /10
                          </Text>
                          <Text style={styles.alertItemBody}>
                            {p.notaReciente}
                          </Text>
                        </TouchableOpacity>
                      ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalResenas}
        transparent
        animationType="slide"
        onRequestClose={() => setModalResenas(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "82%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Calificaciones y Reseñas ⭐ {promedioEstrellas}
              </Text>
              <TouchableOpacity onPress={() => setModalResenas(false)}>
                <Ionicons name="close" size={22} color={PALETTE.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
            >
              {resenasLista.length === 0 ? (
                <View style={styles.noAlertsBox}>
                  <Ionicons name="star-outline" size={28} color="#F59E0B" />
                  <Text style={styles.emptyBody}>
                    Aún no has recibido calificaciones. Cuando tus pacientes
                    vinculados te califiquen desde su perfil, aparecerán aquí.
                  </Text>
                </View>
              ) : (
                resenasLista.map((res) => (
                  <View key={res.id} style={styles.reviewItemCard}>
                    <View style={styles.reviewItemTop}>
                      <Text style={styles.reviewAuthorName}>
                        {res.esAnonima
                          ? "👤 Paciente Anónimo"
                          : `💜 ${res.autorNombre || "Paciente Lami"}`}
                      </Text>
                      <Text style={styles.reviewStarsBadge}>
                        {"⭐".repeat(Math.max(1, Number(res.calificacion || 5)))}
                      </Text>
                    </View>
                    <Text style={styles.reviewCommentText}>
                      "{res.comentario}"
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalUbicacion}
        transparent
        animationType="slide"
        onRequestClose={() => setModalUbicacion(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Ubicación de consulta 📍</Text>
              <TouchableOpacity onPress={() => setModalUbicacion(false)}>
                <Ionicons name="close" size={22} color={PALETTE.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
            >
              <Text style={styles.notifEmptySub}>
                Por tu privacidad, solo tu ciudad es visible al buscar. Tu
                dirección exacta únicamente se envía cuando aceptas una cita.
              </Text>

              <View style={styles.respondTypeRow}>
                {[
                  ["consultorio_privado", "Consultorio privado"],
                  ["hospital_clinica", "Hospital / Clínica"],
                ].map(([val, lbl]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setEditTipoLugar(val)}
                    style={[
                      styles.respondTypeBtn,
                      editTipoLugar === val && styles.respondTypeBtnAccept,
                    ]}
                  >
                    <Text
                      style={[
                        styles.respondTypeText,
                        editTipoLugar === val && { color: "#FFFFFF" },
                      ]}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editTipoLugar === "hospital_clinica" && (
                <TextInput
                  style={styles.respondInput}
                  placeholder="Nombre del hospital o clínica"
                  value={editNombreLugar}
                  onChangeText={setEditNombreLugar}
                />
              )}

              <TextInput
                style={styles.respondInput}
                placeholder="Ciudad o municipio *"
                value={editCiudad}
                onChangeText={setEditCiudad}
              />

              <TextInput
                style={styles.respondInput}
                placeholder="Dirección (calle, número y colonia) *"
                value={editDireccion}
                onChangeText={setEditDireccion}
              />

              <TextInput
                style={styles.respondInput}
                placeholder="Piso o número de consultorio (opcional)"
                value={editPiso}
                onChangeText={setEditPiso}
              />

              <TouchableOpacity
                disabled={guardandoUbicacion}
                onPress={handleGuardarUbicacion}
                style={{ marginTop: 6 }}
              >
                <LinearGradient
                  colors={[PALETTE.tealDeep, PALETTE.indigoMuted]}
                  style={styles.respondSubmitBtn}
                >
                  <Text style={styles.respondSubmitText}>
                    {guardandoUbicacion ? "Guardando..." : "Guardar ubicación"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
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
  solicitudesAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#F0FDFA",
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.5,
    borderColor: "#5EEAD4",
  },
  solicitudesIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  solicitudesBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F766E",
  },
  solicitudesBannerSub: {
    fontSize: 11,
    color: "#115E59",
    marginTop: 1,
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
  microIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ubicacionConfigCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  ubicacionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  ubicacionConfigTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  ubicacionConfigSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
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
    backgroundColor: "rgba(15, 23, 42, 0.48)",
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
  notifSectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  notifEmptySub: {
    fontSize: 12,
    color: PALETTE.textMuted,
    lineHeight: 17,
  },
  solItemCard: {
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#99F6E4",
    gap: 7,
  },
  solItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  solPacienteName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  solModPill: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  solModText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0F766E",
    textTransform: "capitalize",
  },
  solMensajeText: {
    fontSize: 12.5,
    color: "#334155",
    fontStyle: "italic",
  },
  solActionBtn: {
    backgroundColor: "#0D9488",
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  solActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  respondCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  respondTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  respondQuote: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
  },
  respondTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  respondTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  respondTypeBtnAccept: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  respondTypeBtnReject: {
    backgroundColor: "#E11D48",
    borderColor: "#E11D48",
  },
  respondTypeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  respondLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  respondInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#1E293B",
  },
  respondSubmitBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  respondSubmitText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  reviewItemCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 5,
  },
  reviewItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewAuthorName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#78350F",
  },
  reviewStarsBadge: {
    fontSize: 11,
  },
  reviewCommentText: {
    fontSize: 12.5,
    color: "#451A03",
    lineHeight: 18,
    fontStyle: "italic",
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