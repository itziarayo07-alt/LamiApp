import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Linking,
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

// Paleta oficial Lami (Inversión Aurora Lavanda + Teal Clínico)
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

const DIAS_SEMANA = [
  { key: "lun", dia: "Lun", num: "09", labelCompleto: "Lunes 09 Nov" },
  { key: "mar", dia: "Mar", num: "10", labelCompleto: "Martes 10 Nov" },
  { key: "mie", dia: "Mié", num: "11", labelCompleto: "Miércoles 11 Nov" },
  { key: "jue", dia: "Jue", num: "12", labelCompleto: "Jueves 12 Nov • Hoy" },
  { key: "vie", dia: "Vie", num: "13", labelCompleto: "Viernes 13 Nov" },
  { key: "sab", dia: "Sáb", num: "14", labelCompleto: "Sábado 14 Nov" },
  { key: "dom", dia: "Dom", num: "15", labelCompleto: "Domingo 15 Nov" },
];

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
  { id: "crisis", label: "Abordaje de crisis y respiración", icon: "pulse-outline" },
  { id: "cognitiva", label: "Reestructuración cognitiva", icon: "bulb-outline" },
  { id: "progreso", label: "Seguimiento de progreso semanal", icon: "trending-up-outline" },
  { id: "otro", label: "Otro enfoque personalizado", icon: "create-outline" },
];

const getPacienteKey = (pac, index = 0) =>
  pac?.id || pac?.uid || pac?.correo || `${pac?.nombre || "pac"}-${index}`;

export default function AgendaPsicologo({ navigation }) {
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [citasFirestore, setCitasFirestore] = useState([]);

  // Paciente activo seleccionado arriba
  const [pacienteActivoKey, setPacienteActivoKey] = useState(null);

  // Cita seleccionada en la lista para mostrar opción de eliminar
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState(null);

  // Modalidad global del consultorio ("consultorio" | "online")
  const [modalidadGlobal, setModalidadGlobal] = useState("consultorio");
  const [direccionConsultorio, setDireccionConsultorio] = useState(
    "Torre Médica #402, Consultorio 4B"
  );
  const [editandoDireccion, setEditandoDireccion] = useState(false);

  // Día seleccionado en la tira semanal
  const [diaSeleccionado, setDiaSeleccionado] = useState("jue");

  // Modal para crear nueva cita (Inicio + Término)
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [turnoHorario, setTurnoHorario] = useState("manana"); // "manana" | "tarde"
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

  // Modal bonito de confirmación
  const [citaConfirmadaModal, setCitaConfirmadaModal] = useState(null);

  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";

  // 1. Perfil del psicólogo
  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubPerfil = onSnapshot(
      doc(db, "psicologos", auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPerfilPsicologo(data);
          if (data.direccionConsultorio) {
            setDireccionConsultorio(data.direccionConsultorio);
          }
        }
      }
    );
    return () => unsubPerfil();
  }, []);

  // 2. Pacientes reales vinculados mediante código QR
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

  // 3. Citas reales guardadas en Firestore
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

  // Objeto del paciente seleccionado actualmente
  const pacienteSeleccionado = useMemo(() => {
    if (pacientes.length === 0) return null;
    const idx = pacientes.findIndex(
      (p, i) => getPacienteKey(p, i) === pacienteActivoKey
    );
    return idx >= 0 ? pacientes[idx] : pacientes[0];
  }, [pacientes, pacienteActivoKey]);

  // Formato final de horario con hora de inicio y término (ej. "08:00 - 08:50 AM")
  const horarioFormateado = useMemo(() => {
    const sufijo = turnoHorario === "manana" ? "AM" : "PM";
    return `${horaInicio}:${minutoInicio} - ${horaFin}:${minutoFin} ${sufijo}`;
  }, [horaInicio, minutoInicio, horaFin, minutoFin, turnoHorario]);

  // Filtrar citas del día seleccionado
  const agendaDelDia = useMemo(() => {
    return citasFirestore.filter((item) => item.diaKey === diaSeleccionado);
  }, [citasFirestore, diaSeleccionado]);

  const infoDiaActual =
    DIAS_SEMANA.find((d) => d.key === diaSeleccionado) || DIAS_SEMANA[3];

  // Compartir ubicación Maps o enlace online
  const handleCompartirUbicacion = async () => {
    try {
      const mensaje =
        modalidadGlobal === "consultorio"
          ? `📍 Ubicación de nuestra consulta con ${nombreMostrar}:\n${direccionConsultorio}\n\nGoogle Maps: https://maps.google.com/?q=${encodeURIComponent(
              direccionConsultorio
            )}`
          : `🎥 Enlace para nuestra sesión online con ${nombreMostrar}:\nhttps://meet.google.com\n\nTe espero puntual en tu espacio seguro Lami.`;

      await Share.share({ message: mensaje });
    } catch (_) {
      Alert.alert("Error", "No se pudo compartir la información.");
    }
  };

  // Compartir pase de cita confirmada
  const handleCompartirPaseCita = async (cita) => {
    try {
      const detalleLugar =
        cita.modalidad === "presencial"
          ? `📍 Presencial: ${direccionConsultorio}`
          : `🎥 Videollamada Lami: https://meet.google.com`;

      await Share.share({
        message: `✨ Cita Confirmada en Lami\nPaciente: ${cita.pacienteNombre}\nDía: ${cita.diaLabel}\nHorario: ${cita.horario}\n${detalleLugar}\nEnfoque: ${cita.motivo}`,
      });
    } catch (_) {}
  };

  // Unirse a videollamada
  const handleUnirseVideollamada = async (cita) => {
    const url = cita.enlaceReunion || "https://meet.google.com";
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Videollamada Lami",
          `Sala lista para ${cita.pacienteNombre}`
        );
      }
    } catch (_) {
      Alert.alert(
        "Videollamada Lami",
        `Iniciando sala con ${cita.pacienteNombre}`
      );
    }
  };

  // Iniciar sesión presencial -> abrir expediente del paciente vinculado
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
    navigation.navigate("ExpedientePaciente", { paciente: pacienteMatch });
  };

  // Eliminar cita seleccionada
  const handleEliminarCita = (cita) => {
    Alert.alert(
      "Eliminar cita",
      `¿Deseas cancelar y eliminar la cita de ${cita.pacienteNombre} (${cita.horario})?`,
      [
        { text: "Conservar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              if (
                auth.currentUser?.uid &&
                cita.id &&
                !String(cita.id).startsWith("local-")
              ) {
                await deleteDoc(doc(db, "citas_psicologo", cita.id));
              } else {
                setCitasFirestore((prev) =>
                  prev.filter((item) => item.id !== cita.id)
                );
              }
              if (citaSeleccionadaId === cita.id) {
                setCitaSeleccionadaId(null);
              }
            } catch (_) {
              Alert.alert("Error", "No se pudo eliminar la cita.");
            }
          },
        },
      ]
    );
  };

  // Guardar nueva cita vinculada al paciente seleccionado
  const handleGuardarNuevaCita = async () => {
    if (!pacienteSeleccionado) {
      Alert.alert(
        "Sin pacientes vinculados",
        "Primero vincula al menos un paciente mediante tu código QR."
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

      const nueva = {
        psicologoId: auth.currentUser?.uid || "PSI-DEMO-492",
        pacienteId: pacienteSeleccionado.id || pacienteSeleccionado.uid || null,
        diaKey: diaSeleccionado,
        diaLabel: infoDiaActual.labelCompleto,
        tipo: "cita",
        modalidad: nuevaModalidad,
        turno: turnoHorario,
        horario: horarioFormateado,
        horaInicio: `${horaInicio}:${minutoInicio}`,
        horaFin: `${horaFin}:${minutoFin}`,
        pacienteNombre: pacienteSeleccionado.nombre || "Paciente Lami",
        foto:
          pacienteSeleccionado.fotoPerfil ||
          pacienteSeleccionado.foto ||
          null,
        sesionNum: citasPreviasPaciente + 1,
        motivo: motivoFinal,
        estadoRecordatorio:
          nuevaModalidad === "presencial"
            ? "Recordatorio + Maps listo"
            : "Recordatorio 1h activado",
        ubicacion: "Consultorio 4B",
        enlaceReunion: "https://meet.google.com",
        createdAt: serverTimestamp(),
      };

      if (auth.currentUser?.uid) {
        await addDoc(collection(db, "citas_psicologo"), nueva);
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

  const irAPantalla = (routeName, params = {}) => {
    navigation.navigate(routeName, params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ============================================================ */}
      {/* CABECERA INMERSIVA AURORA LAVANDA & ÍNDIGO                   */}
      {/* ============================================================ */}
      <LinearGradient
        colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroBubbleOne} />
        <View style={styles.heroBubbleTwo} />

        {/* Fila Superior: Doctor + Código + Botón Nueva Cita */}
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

        {/* Tarjeta Destacada: Paciente Seleccionado Actualmente */}
        <View style={styles.selectedPatientBanner}>
          {pacienteSeleccionado ? (
            <>
              <View style={styles.selectedBannerLeft}>
                <LinearGradient
                  colors={[PALETTE.tealMid, PALETTE.tealDeep]}
                  style={styles.selectedPatientAvatar}
                >
                  <Text style={styles.selectedPatientInitial}>
                    {(pacienteSeleccionado.nombre || "P")[0].toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTag}>
                    PACIENTE SELECCIONADO PARA AGENDA
                  </Text>
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {pacienteSeleccionado.nombre}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setModalNuevaCita(true)}
                style={styles.quickSchedulePill}
              >
                <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                <Text style={styles.quickScheduleText}>Citar</Text>
              </TouchableOpacity>
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

        {/* Selector Rápido Horizontal de Pacientes Vinculados */}
        {pacientes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.heroPatientsScroll}
          >
            {pacientes.map((pac, idx) => {
              const keyUnica = getPacienteKey(pac, idx);
              const isSelected = keyUnica === pacienteActivoKey;
              return (
                <TouchableOpacity
                  key={keyUnica}
                  onPress={() => setPacienteActivoKey(keyUnica)}
                  activeOpacity={0.85}
                  style={[
                    styles.heroPatientChip,
                    isSelected && styles.heroPatientChipActive,
                  ]}
                >
                  <View
                    style={[
                      styles.chipDot,
                      {
                        backgroundColor: isSelected
                          ? PALETTE.purpleVibrant
                          : PALETTE.tealMid,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.heroPatientChipText,
                      isSelected && styles.heroPatientChipTextActive,
                    ]}
                  >
                    {pac.nombre}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={PALETTE.purpleVibrant}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ============================================================ */}
      {/* CUERPO DE LA AGENDA                                          */}
      {/* ============================================================ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TIRA SEMANAL DE CALENDARIO */}
        <View style={styles.weekStripCard}>
          {DIAS_SEMANA.map((item) => {
            const seleccionado = diaSeleccionado === item.key;
            const tieneCitasReales = citasFirestore.some(
              (c) => c.diaKey === item.key
            );
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  setDiaSeleccionado(item.key);
                  setCitaSeleccionadaId(null);
                }}
                activeOpacity={0.85}
                style={styles.dayTouchable}
              >
                {seleccionado ? (
                  <LinearGradient
                    colors={[PALETTE.tealDeep, PALETTE.tealMid]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.dayPillActive}
                  >
                    <Text style={styles.dayNameActive}>{item.dia}</Text>
                    <Text style={styles.dayNumActive}>{item.num}</Text>
                    <View style={styles.dayDotActive} />
                  </LinearGradient>
                ) : (
                  <View style={styles.dayPillInactive}>
                    <Text style={styles.dayNameInactive}>{item.dia}</Text>
                    <Text style={styles.dayNumInactive}>{item.num}</Text>
                    <View
                      style={[
                        styles.dayDotInactive,
                        tieneCitasReales && {
                          backgroundColor: PALETTE.purpleVibrant,
                        },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. BARRA COMPACTA DE MODALIDAD DEL CONSULTORIO */}
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
                    : "Sala Virtual Lami • Enlace listo para compartir"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. ENCABEZADO DEL DÍA */}
        <View style={styles.dayHeaderRow}>
          <Text style={styles.dayHeadingText}>{infoDiaActual.labelCompleto}</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              {agendaDelDia.length}{" "}
              {agendaDelDia.length === 1 ? "sesión" : "sesiones"}
            </Text>
          </View>
        </View>

        {/* 4. LISTADO DE CITAS REALES (TOCA UNA CITA PARA VER EL BOTÓN DE ELIMINAR) */}
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
                ? `¿Quieres agendar una sesión con ${pacienteSeleccionado.nombre} para el ${infoDiaActual.labelCompleto}?`
                : "Selecciona un paciente arriba y toca Agendar para programar su consulta."}
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

                    {item.foto ? (
                      <Image
                        source={{ uri: item.foto }}
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

                  {/* BARRA DE ELIMINACIÓN AL SELECCIONAR LA CITA */}
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

      {/* ============================================================ */}
      {/* MODAL DE NUEVA CITA (INICIO + TÉRMINO + PICKERS CORREGIDOS)   */}
      {/* ============================================================ */}
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
                <Text style={styles.modalSub}>{infoDiaActual.labelCompleto}</Text>
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
              {/* 1. PACIENTE SELECCIONADO VISIBLEMENTE Y SELECTOR FUNCIONAL */}
              <Text style={styles.inputLabel}>Paciente seleccionado</Text>
              {pacienteSeleccionado && (
                <LinearGradient
                  colors={["#F3E8FF", "#E0F2FE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.selectedPatientPreviewCard}
                >
                  <View style={styles.previewBadgeCircle}>
                    <Text style={styles.previewBadgeLetter}>
                      {(pacienteSeleccionado.nombre || "P")[0].toUpperCase()}
                    </Text>
                  </View>
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

              {/* 2. TURNO + HORA DE INICIO Y HORA DE TÉRMINO */}
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

              {/* HORA DE INICIO */}
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
                        <Picker.Item key={`ini-h-${h}`} label={`${h} hrs`} value={h} />
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
                        <Picker.Item key={`ini-m-${m}`} label={`:${m} min`} value={m} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* HORA DE TÉRMINO */}
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
                        <Picker.Item key={`fin-h-${h}`} label={`${h} hrs`} value={h} />
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
                        <Picker.Item key={`fin-m-${m}`} label={`:${m} min`} value={m} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* 3. MODALIDAD */}
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

              {/* 4. ENFOQUE DE LA SESIÓN */}
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

      {/* ============================================================ */}
      {/* MENSAJE BONITO DE CONFIRMACIÓN DE CITA                       */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* BARRA INFERIOR DE 5 ICONOS (CON AGENDA ACTIVA)               */}
      {/* ============================================================ */}
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

  /* Hero Header Lavanda & Índigo */
  heroHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    gap: 12,
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
    gap: 10,
  },
  heroDoctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
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
    gap: 7,
  },
  heroName: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  heroCodeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heroCodeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSub: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 1,
  },
  heroNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 8.5,
    borderRadius: 14,
    elevation: 3,
  },
  heroNewBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
  },

  /* Banner Paciente Seleccionado */
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
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
  selectedName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 1,
  },
  selectedEmptyText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
  },
  quickSchedulePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PALETTE.tealDeep,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  quickScheduleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Chips horizontales en cabecera */
  heroPatientsScroll: {
    gap: 8,
    paddingTop: 2,
  },
  heroPatientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  heroPatientChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroPatientChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroPatientChipTextActive: {
    color: PALETTE.purpleVibrant,
    fontWeight: "800",
  },

  /* Cuerpo */
  scrollContent: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: PALETTE.bgCanvas,
    flexGrow: 1,
    gap: 13,
  },

  /* Tira Semanal */
  weekStripCard: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8E4F8",
  },
  dayTouchable: {
    flex: 1,
    alignItems: "center",
  },
  dayPillActive: {
    width: 44,
    paddingVertical: 9,
    borderRadius: 16,
    alignItems: "center",
    gap: 3,
    elevation: 3,
  },
  dayPillInactive: {
    width: 44,
    paddingVertical: 9,
    borderRadius: 16,
    alignItems: "center",
    gap: 3,
  },
  dayNameActive: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  dayNumActive: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  dayDotActive: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
    marginTop: 1,
  },
  dayNameInactive: {
    fontSize: 10.5,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  dayNumInactive: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  dayDotInactive: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#CBD5E1",
    marginTop: 1,
  },

  /* Modalidad Compacta */
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

  /* Encabezado Día */
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

  /* Tarjeta Cita */
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

  /* Barra Eliminar Cita */
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

  /* Estado Vacío */
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

  /* Modal Nueva Cita */
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PALETTE.purpleVibrant,
    alignItems: "center",
    justifyContent: "center",
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

  /* Selector Horario con Inicio y Término sin recorte */
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

  /* Enfoque de sesión en lista vertical limpia + Otro */
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

  /* Modal Confirmación Bonito */
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
    alignItems: "center",
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

  /* Barra Inferior */
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