import { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import {
  Entypo,
  FontAwesome,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";

import * as Notifications from "expo-notifications";

// para respetar status bar (batería/hora) y NO pegarse arriba
import { useSafeAreaInsets } from "react-native-safe-area-context";

// importamos la base de datos
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { vincularConPsicologo } from "../services/lamiSyncService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PREFS_KEY = "@prefs_goal_notifications";
const NOTIF_IDS_KEY = "@scheduled_notif_ids";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("es");

  // Estados de especialista vinculado
  const [codigoPsicologo, setCodigoPsicologo] = useState("");
  const [psicologoId, setPsicologoId] = useState(null);
  const [psicologoVinculado, setPsicologoVinculado] = useState(null);
  const [psicologoEspecialidad, setPsicologoEspecialidad] = useState("");
  const [psicologoFoto, setPsicologoFoto] = useState(null);
  const [psicologoDetalle, setPsicologoDetalle] = useState(null);
  const [modalInfoPsicologo, setModalInfoPsicologo] = useState(false);
  const [modalConfirmDesvincular, setModalConfirmDesvincular] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);

  // Estados para escáner QR en Expo Go
  const [modalEscanerQR, setModalEscanerQR] = useState(false);
  const [qrEscaneado, setQrEscaneado] = useState(false);
  const [camaraLista, setCamaraLista] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!modalEscanerQR) {
      setCamaraLista(false);
      return;
    }
    const timer = setTimeout(() => setCamaraLista(true), 150);
    return () => clearTimeout(timer);
  }, [modalEscanerQR]);

  // Centro de ayuda
  const [showHelp, setShowHelp] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Config
  const [showConfig, setShowConfig] = useState(false);
  const configRotateAnim = useRef(new Animated.Value(0)).current;

  // Feedback
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const toggleConfig = () => {
    Animated.timing(configRotateAnim, {
      toValue: showConfig ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setShowConfig(!showConfig);
  };

  const rotateConfigChevron = configRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const toggleHelp = () => {
    Animated.timing(rotateAnim, {
      toValue: showHelp ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setShowHelp(!showHelp);
  };

  const rotateChevron = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // NAV: Perfil activo
  const [activeNav, setActiveNav] = useState(3);

  // cositas interactivas del perfil
  const [mood, setMood] = useState("Tranquila");
  const [goal, setGoal] = useState("3 chequeos al día");
  const [notificationsOn, setNotificationsOn] = useState(true);

  const [calmStreak, setCalmStreak] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  const getLocalDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getYesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  };

  const loadCounters = async () => {
    const streakSaved = await AsyncStorage.getItem("@calm_streak");
    const sessionsSaved = await AsyncStorage.getItem("@sessions_count");

    setCalmStreak(streakSaved ? Number(streakSaved) : 0);
    setSessionsCount(sessionsSaved ? Number(sessionsSaved) : 0);
  };

  const loadPreferences = async () => {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (saved.goal) setGoal(saved.goal);
      if (typeof saved.notificationsOn === "boolean") {
        setNotificationsOn(saved.notificationsOn);
      }
    } catch (e) {
      console.log("Error leyendo prefs:", e);
    }
  };

  const savePreferences = async (nextGoal, nextNotificationsOn) => {
    await AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ goal: nextGoal, notificationsOn: nextNotificationsOn })
    );
  };

  const ensureNotifPermission = async () => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") return true;

      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (e) {
      return false;
    }
  };

  const cancelScheduled = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIF_IDS_KEY);
    } catch (e) {
      console.log("Notificaciones canceladas omitidas en Expo Go");
    }
  };

  const scheduleForGoal = async (nextGoal) => {
    try {
      await cancelScheduled();

      if (nextGoal === "Solo cuando lo necesite") return;

      const times3 = [
        { hour: 10, minute: 0 },
        { hour: 15, minute: 0 },
        { hour: 20, minute: 0 },
      ];

      const times5 = [
        { hour: 9, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 15, minute: 0 },
        { hour: 18, minute: 0 },
        { hour: 21, minute: 0 },
      ];

      const times = nextGoal === "5 chequeos al día" ? times5 : times3;

      const ids = [];
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Chequeo suave 💜",
            body: "¿Cómo te sientes ahora mismo? Respira y revisemos juntas.",
          },
          trigger: { hour: t.hour, minute: t.minute, repeats: true },
        });
        ids.push(id);
      }

      await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
    } catch (e) {
      console.log("Programación de notificaciones omitida en Expo Go");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCounters();
      loadPreferences();
      loadProfileData();
    }, [])
  );

  const registerCalmDay = async () => {
    const today = getLocalDateKey();
    const yesterday = getYesterdayKey();

    const lastDay = await AsyncStorage.getItem("@calm_last_day");
    const streakSaved = await AsyncStorage.getItem("@calm_streak");
    let streak = streakSaved ? Number(streakSaved) : 0;

    if (lastDay === today) return;

    if (lastDay === yesterday) {
      streak = streak + 1;
    } else {
      streak = 1;
    }

    await AsyncStorage.setItem("@calm_last_day", today);
    await AsyncStorage.setItem("@calm_streak", String(streak));
    setCalmStreak(streak);
  };

  const addSession = async () => {
    const saved = await AsyncStorage.getItem("@sessions_count");
    const current = saved ? Number(saved) : 0;
    const next = current + 1;

    await AsyncStorage.setItem("@sessions_count", String(next));
    setSessionsCount(next);
  };

  const loadPsicologoDetalle = async (idPsi) => {
    if (!idPsi) return;
    try {
      const psiSnap = await getDoc(doc(db, "psicologos", idPsi));
      if (psiSnap.exists()) {
        setPsicologoDetalle(psiSnap.data());
      }
    } catch (e) {
      console.log("Error cargando detalle del psicólogo:", e);
    }
  };

  const loadProfileData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setName(data.nombre ?? "");
        setEmail(data.correo ?? user.email);
        setPhone(data.telefono ?? "");

        if (data.psicologoId) {
          setPsicologoId(data.psicologoId);
          setPsicologoVinculado(data.psicologoNombre || "Especialista Lami");
          setPsicologoEspecialidad(data.psicologoEspecialidad || "");
          setPsicologoFoto(data.psicologoFoto || null);
          loadPsicologoDetalle(data.psicologoId);
        } else {
          setPsicologoId(null);
          setPsicologoVinculado(null);
          setPsicologoEspecialidad("");
          setPsicologoFoto(null);
          setPsicologoDetalle(null);
        }
      }
    } catch (error) {
      console.log("Error cargando perfil:", error);
    }
  };

  // Abre modal bonito de confirmación para desvincular
  const abrirConfirmacionDesvincular = () => {
    setModalInfoPsicologo(false);
    setModalConfirmDesvincular(true);
  };

  // Ejecuta la desvinculación en Firestore
  const confirmarDesvincularPsicologo = async () => {
    try {
      setDesvinculando(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      await updateDoc(doc(db, "usuarios", uid), {
        psicologoId: null,
        psicologoNombre: null,
        psicologoFoto: null,
        psicologoEspecialidad: null,
      });

      setPsicologoId(null);
      setPsicologoVinculado(null);
      setPsicologoEspecialidad("");
      setPsicologoFoto(null);
      setPsicologoDetalle(null);
      setCodigoPsicologo("");
      setModalConfirmDesvincular(false);
      setModalInfoPsicologo(false);

      Alert.alert(
        "Cuenta desvinculada",
        "Ya no estás conectada con ningún especialista. Puedes vincular otro código cuando quieras."
      );
    } catch (err) {
      Alert.alert("Error", "No se pudo desvincular: " + err.message);
    } finally {
      setDesvinculando(false);
    }
  };

  // Abrir cámara para escanear QR del psicólogo
  const abrirEscanerQR = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          "Permiso de cámara",
          "Activa el permiso de cámara para escanear el código QR de tu especialista."
        );
        return;
      }
    }
    setQrEscaneado(false);
    setCamaraLista(false);
    setModalEscanerQR(true);
  };

  // Procesar resultado del QR escaneado ("LAMI-LINK|PSI-492|uid" o "PSI-492")
  const handleBarCodeScanned = async ({ data }) => {
    if (qrEscaneado || vinculando) return;
    setQrEscaneado(true);

    const texto = String(data || "").trim().toUpperCase();
    const codigoExtraido = texto.startsWith("LAMI-LINK|")
      ? texto.split("|")[1] || ""
      : texto;

    setCamaraLista(false);
    setModalEscanerQR(false);
    setCodigoPsicologo(codigoExtraido);

    try {
      setVinculando(true);
      const res = await vincularConPsicologo(
        auth.currentUser.uid,
        codigoExtraido
      );
      setPsicologoId(res.psicologoId);
      setPsicologoVinculado(res.psicologoNombre);
      setPsicologoEspecialidad(res.psicologoEspecialidad || "");
      setPsicologoFoto(res.psicologoFoto);
      loadPsicologoDetalle(res.psicologoId);
      Alert.alert(
        "¡Vinculación exitosa!",
        `Ahora estás conectado con ${res.psicologoNombre}`
      );
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setVinculando(false);
      setQrEscaneado(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Deseas cerrar sesión?",
      [
        {
          text: "No",
          onPress: () => console.log("Cierre de sesión cancelado"),
          style: "cancel",
        },
        {
          text: "Sí",
          onPress: async () => {
            try {
              await signOut(auth);

              setName("");
              setEmail("");
              setPhone("");

              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error) {
              Alert.alert("Error", "No se pudo cerrar sesión");
              console.log("Error al cerrar sesión:", error);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      "Eliminar cuenta",
      "¿Estás segura de que deseas eliminar tu cuenta? Esto es irreversible.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "usuarios", user.uid));
              await deleteUser(user);

              setName("");
              setEmail("");
              setPhone("");

              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });

              Alert.alert(
                "Cuenta eliminada",
                "Tu cuenta ha sido eliminada correctamente."
              );
            } catch (error) {
              console.log("Error al eliminar cuenta:", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Sesión expirada",
                  "Para eliminar la cuenta, vuelve a iniciar sesión primero.",
                  [
                    {
                      text: "Ir al login",
                      onPress: async () => {
                        await signOut(auth);
                        navigation.reset({
                          index: 0,
                          routes: [{ name: "Login" }],
                        });
                      },
                    },
                  ]
                );
              } else {
                Alert.alert("Error", error.message);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3e8ff" }}>
      <LinearGradient colors={["#faf5ff", "#f3e8ff"]} style={{ flex: 1 }}>
        <View style={styles.screen}>
          {/* NAV BAR ARRIBA y FUERA del ScrollView */}
          <View
            style={[
              styles.navBar,
              {
                paddingTop: insets.top + 10,
              },
            ]}
          >
            {[
              ["stats-chart-outline", "Anxiósometro", "Anxiosimetro"],
              ["calendar-outline", "Calendario", "Calendario"],
              ["heart-outline", "Checking", "Checking"],
              ["person-circle-outline", "Perfil", "Perfil"],
            ].map(([icon, label, screen], i) => (
              <TouchableOpacity
                key={i}
                style={styles.navItem}
                onPress={() => {
                  setActiveNav(i);
                  navigation.navigate(screen);
                }}
              >
                <Ionicons
                  name={icon}
                  size={26}
                  color={activeNav === i ? "#7C3AED" : "#9CA3AF"}
                />
                {activeNav === i && (
                  <Text style={styles.navLabelActive}>{label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 18 }}
            showsVerticalScrollIndicator={false}
          >
            {/* TARJETA DE BIENVENIDA */}
            <LinearGradient
              colors={["#ffffff", "#f5f3ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.helloText}>Hola,</Text>
                <Text style={styles.nameBig}>{name}</Text>

                <LinearGradient
                  colors={["#ede9fe", "#e0f2fe"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
                  <Text style={styles.badgeText}>Tu espacio seguro 💜</Text>
                </LinearGradient>

                <Text style={styles.smallText}>
                  Hoy te sientes: <Text style={styles.moodText}>{mood}</Text>
                </Text>
              </View>

              <View style={styles.avatarCircle}>
                <FontAwesome name="user" size={50} color="#555" />
              </View>
            </LinearGradient>

            {/* ESTADÍSTICAS */}
            <View style={styles.statsRow}>
              <LinearGradient
                colors={["#fef3c7", "#ffe4e6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <Text style={styles.statLabel}>Racha de calma 🔥</Text>
                <Text style={styles.statNumber}>{calmStreak} días</Text>
                <Text style={styles.statHint}>Sigue así, lo haces genial</Text>
              </LinearGradient>

              <LinearGradient
                colors={["#dbeafe", "#ede9fe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <Text style={styles.statLabel}>Sesiones 🎧</Text>
                <Text style={styles.statNumber}>{sessionsCount}</Text>
                <Text style={styles.statHint}>Tu mente se está cuidando</Text>
              </LinearGradient>
            </View>

            {/* BOTON: HICE UNA SESIÓN */}
            <TouchableOpacity onPress={addSession} style={styles.sessionButton}>
              <Text style={styles.sessionButtonText}>Hice una sesión 🎧</Text>
            </TouchableOpacity>

            {/* ESTADO DE HOY */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu estado de hoy ✨</Text>
              <Text style={styles.sectionSubtitle}>
                Toca una opción para actualizar cómo te sientes.
              </Text>

              <View style={styles.chipsRow}>
                {["Tranquila😌", "Nerviosa 😰", "Cansada 🥱"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, mood === item && styles.chipActive]}
                    onPress={async () => {
                      setMood(item);

                      if (item === "Tranquila 😌") {
                        await registerCalmDay();
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        mood === item && styles.chipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* VINCULACIÓN CON PSICÓLOGO (SIN FLECHITA > INNECESARIA) */}
            <View style={styles.card}>
              <View style={styles.especialistaHeaderRow}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                  Mi Especialista 🩺
                </Text>
                {psicologoVinculado && (
                  <View style={styles.activeLinkPill}>
                    <View style={styles.activeLinkDot} />
                    <Text style={styles.activeLinkText}>Enlace activo</Text>
                  </View>
                )}
              </View>

              {psicologoVinculado ? (
                <View style={{ marginTop: 10 }}>
                  <LinearGradient
                    colors={["#F8F7FF", "#F0F9FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.especialistaCard}
                  >
                    <View style={styles.avatarRing}>
                      {psicologoFoto ? (
                        <Image
                          source={{ uri: psicologoFoto }}
                          style={styles.especialistaAvatar}
                        />
                      ) : (
                        <View style={styles.especialistaAvatarPlaceholder}>
                          <Ionicons name="medkit" size={24} color="#7C3AED" />
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.especialistaTag}>
                        ACOMPAÑAMIENTO CLÍNICO
                      </Text>
                      <Text style={styles.especialistaName}>
                        {psicologoVinculado}
                      </Text>
                      <Text style={styles.especialistaSpec} numberOfLines={1}>
                        {psicologoDetalle?.especialidad ||
                          psicologoEspecialidad ||
                          "Psicología Clínica • Red Lami"}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Botones de acción: Ver perfil y Desvincular */}
                  <View style={styles.especialistaActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (psicologoId && !psicologoDetalle) {
                          loadPsicologoDetalle(psicologoId);
                        }
                        setModalInfoPsicologo(true);
                      }}
                      style={styles.verInfoBtn}
                    >
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#6D28D9"
                      />
                      <Text style={styles.verInfoBtnText}>Ver perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={desvinculando}
                      onPress={abrirConfirmacionDesvincular}
                      style={styles.desvincularBtn}
                    >
                      <Ionicons
                        name="unlink-outline"
                        size={16}
                        color="#E11D48"
                      />
                      <Text style={styles.desvincularBtnText}>
                        {desvinculando ? "Desvinculando..." : "Desvincular"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.sectionSubtitle, { marginTop: 6 }]}>
                    Ingresa el código que te dio tu psicólogo en consulta (ej.
                    PSI-492) o escanea su código QR.
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        { fontWeight: "700", letterSpacing: 2 },
                      ]}
                      placeholder="PSI-492"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      value={codigoPsicologo}
                      onChangeText={setCodigoPsicologo}
                    />
                    <TouchableOpacity
                      onPress={abrirEscanerQR}
                      style={styles.qrScanInlineBtn}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={22}
                        color="#7C3AED"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    disabled={vinculando || !codigoPsicologo.trim()}
                    onPress={async () => {
                      try {
                        setVinculando(true);
                        const res = await vincularConPsicologo(
                          auth.currentUser.uid,
                          codigoPsicologo
                        );
                        setPsicologoId(res.psicologoId);
                        setPsicologoVinculado(res.psicologoNombre);
                        setPsicologoEspecialidad(
                          res.psicologoEspecialidad || ""
                        );
                        setPsicologoFoto(res.psicologoFoto);
                        loadPsicologoDetalle(res.psicologoId);
                        Alert.alert(
                          "¡Vinculación exitosa!",
                          `Ahora estás conectado con ${res.psicologoNombre}`
                        );
                      } catch (err) {
                        Alert.alert("Error", err.message);
                      } finally {
                        setVinculando(false);
                      }
                    }}
                    style={[
                      styles.sessionButton,
                      { marginTop: 12, marginBottom: 8 },
                    ]}
                  >
                    <Text style={styles.sessionButtonText}>
                      {vinculando
                        ? "Vinculando..."
                        : "Vincular con mi psicólogo"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={abrirEscanerQR}
                    style={styles.qrScanButton}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={18}
                      color="#7C3AED"
                    />
                    <Text style={styles.qrScanButtonText}>
                      Escanear QR en consulta
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* DATOS PERSONALES */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Datos personales 👤</Text>

              {/* NOMBRE */}
              <View style={styles.rowBetween}>
                <Text style={styles.labelInline}>Nombre</Text>
                <TouchableOpacity>
                  <MaterialIcons name="edit" size={18} color="#7C3AED" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* CORREO */}
              <View style={styles.rowBetween}>
                <Text style={styles.labelInline}>Correo</Text>
                <MaterialIcons name="email" size={16} color="#7C3AED" />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <MaterialIcons name="edit" size={20} color="#7C3AED" />
              </View>

              {/* TELÉFONO */}
              <View style={styles.rowBetween}>
                <Text style={styles.labelInline}>Número celular</Text>
                <MaterialIcons name="phone-android" size={16} color="#7C3AED" />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <MaterialIcons name="edit" size={20} color="#7C3AED" />
              </View>

              {/* IDIOMA */}
              <Text style={styles.labelInline}>Idioma 🌐</Text>
              <View style={styles.dropdown}>
                <Picker selectedValue={language} onValueChange={setLanguage}>
                  <Picker.Item label="Español" value="es" />
                  <Picker.Item label="Inglés" value="en" />
                </Picker>
              </View>
            </View>

            {/* PREFERENCIAS & METAS */}
            <LinearGradient
              colors={["#fdf2ff", "#e0f2fe"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardColored}
            >
              <Text style={styles.sectionTitle}>Preferencias & metas 🎯</Text>

              <Text style={styles.labelInline}>Meta diaria</Text>
              <View style={styles.chipsRow}>
                {[
                  "3 chequeos al día",
                  "5 chequeos al día",
                  "Solo cuando lo necesite",
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.chipSmall,
                      goal === item && styles.chipActiveColored,
                    ]}
                    onPress={async () => {
                      setGoal(item);
                      await savePreferences(item, notificationsOn);

                      if (notificationsOn) {
                        const ok = await ensureNotifPermission();
                        if (!ok) {
                          Alert.alert(
                            "Permiso requerido",
                            "Activa permisos de notificaciones para que te recordemos realizar los ejercicios."
                          );
                          return;
                        }
                        await scheduleForGoal(item);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipTextSmall,
                        goal === item && styles.chipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.preferenceRow, { marginTop: 20 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.preferenceTitle}>Notificaciones 📲</Text>
                  <Text style={styles.preferenceSubtitle}>
                    Recordatorios suaves para cuidar tu ansiedad.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.toggle, notificationsOn && styles.toggleOn]}
                  onPress={async () => {
                    const next = !notificationsOn;
                    setNotificationsOn(next);
                    await savePreferences(goal, next);

                    if (next) {
                      const ok = await ensureNotifPermission();
                      if (!ok) {
                        setNotificationsOn(false);
                        await savePreferences(goal, false);
                        Alert.alert(
                          "Permiso requerido",
                          "No se pudo activar notificaciones porque no diste permisos."
                        );
                        return;
                      }
                      await scheduleForGoal(goal);
                    } else {
                      await cancelScheduled();
                    }
                  }}
                >
                  <View
                    style={[
                      styles.toggleCircle,
                      notificationsOn && styles.toggleCircleOn,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* MÁS OPCIONES */}
            <LinearGradient
              colors={["#eef2ff", "#fef9c3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardColored}
            >
              <Text style={styles.sectionTitle}>Más opciones ⚙️</Text>

              {/* Configuración */}
              <TouchableOpacity style={styles.menuItem} onPress={toggleConfig}>
                <View
                  style={[styles.iconBubble, { backgroundColor: "#e0f2fe" }]}
                >
                  <Ionicons name="settings-sharp" size={18} color="#1D4ED8" />
                </View>

                <Text style={styles.menuText}>Configuración</Text>

                <Animated.View
                  style={{
                    marginLeft: "auto",
                    transform: [{ rotate: rotateConfigChevron }],
                  }}
                >
                  <Entypo name="chevron-down" size={22} color="#6B7280" />
                </Animated.View>
              </TouchableOpacity>

              {showConfig && (
                <View style={styles.helpContainer}>
                  <Text style={styles.helpQuestion}>Privacidad</Text>

                  <Text style={styles.helpAnswer}>
                    🔒Tus datos se guardan solo en tu dispositivo.
                  </Text>
                  <Text style={styles.helpAnswer}></Text>

                  <Text style={styles.helpAnswer}>
                    🔒No compartimos información con terceros.
                  </Text>
                  <Text style={styles.helpAnswer}></Text>

                  <Text style={styles.helpAnswer}>
                    🔒Puedes borrar toda tu información cuando desees.
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.helpQuestion}>Información</Text>
                    <Text style={styles.helpAnswer}>Anxiously</Text>
                    <Text style={styles.helpAnswer}>Versión 2.0.0</Text>
                    <Text style={styles.helpAnswer}> </Text>
                    <Text style={styles.helpAnswer}>
                      Esta app fue creada con cariño para acompañarte, no para
                      exigirte.
                    </Text>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.helpQuestion}>
                      ¿Te resultó útil esta información?
                    </Text>

                    <View style={{ flexDirection: "row", marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() =>
                          setFeedbackMsg(
                            "Gracias por estar aquí 💜 Me alegra acompañarte en tu proceso."
                          )
                        }
                        style={{
                          backgroundColor: "#7C3AED",
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          borderRadius: 20,
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                          Sí 💜
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          setFeedbackMsg(
                            "Gracias por decirlo 🤍 Seguiremos mejorando para ti."
                          )
                        }
                        style={{
                          backgroundColor: "#E5E7EB",
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: "#374151", fontWeight: "600" }}>
                          No 🤍
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {feedbackMsg !== "" && (
                      <View
                        style={{
                          marginTop: 12,
                          backgroundColor: "#F5F3FF",
                          padding: 10,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: "#4C1D95", fontSize: 13 }}>
                          {feedbackMsg}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Centro de ayuda */}
              <TouchableOpacity style={styles.menuItem} onPress={toggleHelp}>
                <View
                  style={[styles.iconBubble, { backgroundColor: "#fef3c7" }]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color="#B45309"
                  />
                </View>

                <Text style={styles.menuText}>Centro de ayuda</Text>

                <Animated.View
                  style={{
                    marginLeft: "auto",
                    transform: [{ rotate: rotateChevron }],
                  }}
                >
                  <Entypo name="chevron-down" size={22} color="#6B7280" />
                </Animated.View>
              </TouchableOpacity>

              {showHelp && (
                <View style={styles.helpContainer}>
                  <Text style={styles.helpQuestion}>
                    ¿Cómo reinicio el contador?
                  </Text>
                  <Text style={styles.helpAnswer}>
                    Puedes reiniciar el contador desde el botón de apoyo en la
                    pantalla principal. El tiempo comenzará nuevamente desde
                    cero.
                  </Text>

                  <Text style={styles.helpQuestion}>
                    ¿Por qué no me llegan felicitaciones?
                  </Text>
                  <Text style={styles.helpAnswer}>
                    Revisa que las notificaciones estén activadas y que el modo
                    ahorro de batería no esté bloqueando la app.
                  </Text>

                  <Text style={styles.helpQuestion}>
                    ¿Qué pasa si cambio de celular?
                  </Text>
                  <Text style={styles.helpAnswer}>
                    Los datos se guardan localmente en tu dispositivo. Al
                    cambiar de celular o desinstalar la app, el contador se
                    reiniciará.
                  </Text>

                  <Text style={styles.helpQuestion}>
                    ¿Cómo funciona el calendario?
                  </Text>
                  <Text style={styles.helpAnswer}>
                    El calendario muestra de forma visual los días que has
                    avanzado y tu seguimiento.
                  </Text>

                  <Text style={styles.helpQuestion}>
                    ¿Puedo volver a hacer el test de personalidad?
                  </Text>
                  <Text style={styles.helpAnswer}>
                    No. Solo se puede responder una sola vez, mas adelante
                    haremos mejoras para descubrir como va cambiando tu
                    personalidad.
                  </Text>

                  <View style={styles.crisisBox}>
                    <Text style={styles.crisisTitle}>
                      Si te sientes en riesgo o necesitas apoyo....
                    </Text>

                    <Text style={styles.helpAnswer}>
                      Si estás pasando por un momento muy difícil o necesitas
                      hablar con alguien profesional, hay apoyo gratuito y
                      confidencial. Atención las 24 horas, los 365 días del año.
                    </Text>

                    <Text style={styles.crisisPhone}>
                      📞 Línea de intervención en crisis psicológicas
                      (Veracruz)
                    </Text>

                    <TouchableOpacity
                      onPress={() => Linking.openURL("tel:8002603100")}
                    >
                      <Text style={styles.crisisNumber}>800 260 3100</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => Linking.openURL("tel:2288144465")}
                    >
                      <Text style={styles.crisisNumber}>228 814 4465</Text>
                    </TouchableOpacity>

                    <Text style={[styles.crisisPhone, { marginTop: 6 }]}>
                      📞 Línea de la Vida (México)
                    </Text>

                    <TouchableOpacity
                      onPress={() => Linking.openURL("tel:8009112000")}
                    >
                      <Text style={styles.crisisNumber}>800 911 2000</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Eliminar cuenta */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteAccount}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#fee2e2" }]}
                >
                  <Ionicons name="warning-outline" size={18} color="#DC2626" />
                </View>
                <Text style={[styles.menuText, { color: "#DC2626" }]}>
                  Eliminar cuenta
                </Text>
              </TouchableOpacity>

              {/* Cerrar sesión */}
              <TouchableOpacity
                style={[styles.menuItem, { marginTop: 6 }]}
                onPress={handleLogout}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#e5e7eb" }]}
                >
                  <Ionicons name="log-out-outline" size={18} color="#111827" />
                </View>
                <Text style={[styles.menuText, { color: "#111827" }]}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* MODAL DETALLE DEL ESPECIALISTA VINCULADO */}
      <Modal
        visible={modalInfoPsicologo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfoPsicologo(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <LinearGradient
              colors={["#F3E8FF", "#E0F2FE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoModalTopBanner}
            >
              <TouchableOpacity
                onPress={() => setModalInfoPsicologo(false)}
                style={styles.infoModalClose}
              >
                <Ionicons name="close" size={20} color="#4C1D95" />
              </TouchableOpacity>

              <View style={styles.infoModalAvatarRing}>
                {psicologoFoto ? (
                  <Image
                    source={{ uri: psicologoFoto }}
                    style={styles.infoModalAvatar}
                  />
                ) : (
                  <View style={styles.infoModalAvatarPlaceholder}>
                    <Ionicons name="medkit" size={32} color="#7C3AED" />
                  </View>
                )}
              </View>

              <View style={styles.infoModalBadge}>
                <View style={styles.activeLinkDot} />
                <Text style={styles.infoModalBadgeText}>
                  ESPECIALISTA VINCULADO
                </Text>
              </View>

              <Text style={styles.infoModalName}>{psicologoVinculado}</Text>
              <Text style={styles.infoModalSpec}>
                {psicologoDetalle?.especialidad ||
                  psicologoEspecialidad ||
                  "Psicología Clínica • Red Lami"}
              </Text>
            </LinearGradient>

            <View style={styles.infoModalBody}>
              <View style={styles.infoModalDetailsBox}>
                {psicologoDetalle?.cedula && (
                  <View style={styles.infoDetailRow}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={16}
                        color="#7C3AED"
                      />
                    </View>
                    <Text style={styles.infoDetailText}>
                      Cédula profesional:{" "}
                      <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                        {psicologoDetalle.cedula}
                      </Text>
                    </Text>
                  </View>
                )}

                {psicologoDetalle?.codigoVinculacion && (
                  <View style={styles.infoDetailRow}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="key-outline" size={16} color="#7C3AED" />
                    </View>
                    <Text style={styles.infoDetailText}>
                      Código de enlace:{" "}
                      <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                        {psicologoDetalle.codigoVinculacion}
                      </Text>
                    </Text>
                  </View>
                )}

                {psicologoDetalle?.correo && (
                  <View style={styles.infoDetailRow}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="mail-outline" size={16} color="#7C3AED" />
                    </View>
                    <Text style={styles.infoDetailText}>
                      {psicologoDetalle.correo}
                    </Text>
                  </View>
                )}

                {psicologoDetalle?.telefono && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`tel:${psicologoDetalle.telefono}`)
                    }
                    style={styles.infoDetailRow}
                  >
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="call-outline" size={16} color="#7C3AED" />
                    </View>
                    <Text
                      style={[
                        styles.infoDetailText,
                        {
                          textDecorationLine: "underline",
                          color: "#6D28D9",
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {psicologoDetalle.telefono}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.infoDetailRow}>
                  <View
                    style={[
                      styles.detailIconCircle,
                      { backgroundColor: "#CCFBF1" },
                    ]}
                  >
                    <Ionicons name="sync-outline" size={16} color="#0D9488" />
                  </View>
                  <Text style={styles.infoDetailText}>
                    Recibe tus tests compartidos, alertas del anxiósometro y
                    registros de ansiedad o tristeza del calendario.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={desvinculando}
                onPress={abrirConfirmacionDesvincular}
                style={styles.infoModalUnlinkBtn}
              >
                <Ionicons name="unlink-outline" size={18} color="#E11D48" />
                <Text style={styles.infoModalUnlinkText}>
                  {desvinculando
                    ? "Desvinculando..."
                    : "Desvincular especialista"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL BONITO DE CONFIRMACIÓN PARA DESVINCULAR ESPECIALISTA */}
      <Modal
        visible={modalConfirmDesvincular}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConfirmDesvincular(false)}
      >
        <View style={styles.unlinkOverlay}>
          <View style={styles.unlinkCard}>
            <LinearGradient
              colors={["#FFF1F2", "#FCE7F3"]}
              style={styles.unlinkIconCircle}
            >
              <Ionicons name="unlink" size={28} color="#E11D48" />
            </LinearGradient>

            <Text style={styles.unlinkBadge}>GESTIÓN DE VÍNCULO</Text>
            <Text style={styles.unlinkTitle}>Desvincular especialista</Text>

            <Text style={styles.unlinkBody}>
              ¿Estás segura de que deseas desvincular tu cuenta de{" "}
              <Text style={{ fontWeight: "800", color: "#1E1B4B" }}>
                {psicologoVinculado}
              </Text>
              ?
            </Text>

            <View style={styles.unlinkWarningBox}>
              <Ionicons
                name="shield-outline"
                size={16}
                color="#9F1239"
                style={{ marginTop: 1 }}
              />
              <Text style={styles.unlinkWarningText}>
                Dejará de recibir tus registros emocionales, tests diarios y
                alertas. Podrás volver a vincularte cuando quieras.
              </Text>
            </View>

            <View style={styles.unlinkBtnsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={desvinculando}
                onPress={() => setModalConfirmDesvincular(false)}
                style={styles.unlinkCancelBtn}
              >
                <Text style={styles.unlinkCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={desvinculando}
                onPress={confirmarDesvincularPsicologo}
                style={styles.unlinkConfirmBtn}
              >
                <LinearGradient
                  colors={["#F43F5E", "#E11D48"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.unlinkConfirmGradient}
                >
                  <Text style={styles.unlinkConfirmText}>
                    {desvinculando ? "Desvinculando..." : "Sí, desvincular"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ESCÁNER QR A PANTALLA COMPLETA PARA VINCULAR CON PSICÓLOGO */}
      {modalEscanerQR && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000000",
            zIndex: 999,
            elevation: 20,
          }}
        >
          {camaraLista && cameraPermission?.granted && (
            <CameraView
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: SCREEN_WIDTH,
                height: Dimensions.get("window").height,
              }}
              facing="back"
              active={modalEscanerQR}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={
                qrEscaneado ? undefined : handleBarCodeScanned
              }
            />
          )}

          {/* Capa superior con guía visual y botón cerrar */}
          <SafeAreaView
            style={{
              flex: 1,
              justifyContent: "space-between",
              alignItems: "center",
              padding: 24,
              paddingTop: insets.top + 12,
            }}
          >
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 16,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
              >
                Escanear QR del Psicólogo
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCamaraLista(false);
                  setModalEscanerQR(false);
                }}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View
              pointerEvents="none"
              style={{
                width: 230,
                height: 230,
                borderRadius: 24,
                borderWidth: 3,
                borderColor: "#A374CC",
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
            />

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.72)",
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Apunta la cámara al código QR que te muestra tu especialista en
                consulta.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingBottom: 10,
    elevation: 5,
  },
  navItem: {
    alignItems: "center",
    width: SCREEN_WIDTH * 0.22,
  },
  navLabelActive: {
    color: "#7C3AED",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  headerCard: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  helloText: {
    fontSize: 14,
    color: "#6B7280",
  },
  nameBig: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  smallText: {
    fontSize: 13,
    color: "#6B7280",
  },
  moodText: {
    fontWeight: "600",
    color: "#4C1D95",
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  statHint: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 4,
  },

  sessionButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sessionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Tarjeta y acciones del especialista vinculado
  especialistaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeLinkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  activeLinkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  activeLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  especialistaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  avatarRing: {
    padding: 2.5,
    borderRadius: 32,
    backgroundColor: "#DDD6FE",
    marginRight: 12,
  },
  especialistaAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  especialistaAvatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  especialistaTag: {
    fontSize: 10,
    color: "#7C3AED",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  especialistaName: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E1B4B",
    marginTop: 2,
  },
  especialistaSpec: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "600",
    marginTop: 2,
  },
  especialistaActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  verInfoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  verInfoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  desvincularBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  desvincularBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E11D48",
  },

  // Modal detalle del especialista
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  infoModalTopBanner: {
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  infoModalClose: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoModalAvatarRing: {
    padding: 3.5,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoModalAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  infoModalAvatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  infoModalBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6D28D9",
    letterSpacing: 0.5,
  },
  infoModalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E1B4B",
    textAlign: "center",
  },
  infoModalSpec: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },
  infoModalBody: {
    padding: 20,
  },
  infoModalDetailsBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    gap: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  infoDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDetailText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  infoModalUnlinkBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  infoModalUnlinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E11D48",
  },

  // Modal bonito de confirmación para desvincular
  unlinkOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  unlinkCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  unlinkIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  unlinkBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E11D48",
    letterSpacing: 1,
    marginBottom: 4,
  },
  unlinkTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E1B4B",
    textAlign: "center",
  },
  unlinkBody: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  unlinkWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF1F2",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  unlinkWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#9F1239",
    lineHeight: 17,
  },
  unlinkBtnsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  unlinkCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  unlinkCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  unlinkConfirmBtn: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  unlinkConfirmGradient: {
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  unlinkConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  qrScanInlineBtn: {
    padding: 6,
  },
  qrScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  qrScanButtonText: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: 13.5,
  },

  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardColored: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#7C3AED",
  },
  chipText: {
    fontSize: 13,
    color: "#111827",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginRight: 6,
    marginTop: 4,
  },
  chipTextSmall: {
    fontSize: 12,
    color: "#111827",
  },
  chipActiveColored: {
    backgroundColor: "#7C3AED",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  labelInline: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 6,
  },
  input: {
    flex: 1,
    height: 45,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: 6,
  },

  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  preferenceSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
    width: SCREEN_WIDTH * 0.5,
  },

  toggle: {
    width: 46,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    padding: 3,
    justifyContent: "center",
    marginLeft: "auto",
  },
  toggleOn: {
    backgroundColor: "#7C3AED",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  toggleCircleOn: {
    alignSelf: "flex-end",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  menuText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#374151",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  helpContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
  },

  helpQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6540a1ff",
    marginTop: 10,
  },

  helpAnswer: {
    fontSize: 13,
    color: "#434d5cff",
    lineHeight: 18,
  },

  crisisBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },

  crisisTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 6,
  },

  crisisPhone: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7F1D1D",
    marginTop: 6,
  },

  crisisNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textDecorationLine: "underline",
  },
});