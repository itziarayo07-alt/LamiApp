import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { deleteUser, signOut, updateEmail } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { vincularConPsicologo } from "../services/lamiSyncService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PREFS_KEY = "@prefs_goal_notifications";
const NOTIF_IDS_KEY = "@scheduled_notif_ids";
const CITAS_STORAGE_KEY = "@citas_agendadas_v1";
const USER_PHOTO_KEY = "@user_profile_photo";

const PRIVACIDAD_PSI_DEFAULT = {
  fotoPerfil: true,
  cedulaProfesional: true,
  especialidad: true,
  telefono: false,
  correo: false,
  ubicacion: true,
  biografia: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function normalizarTexto(txt = "") {
  return String(txt)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseHoraToPicker(horaStr = "10:00 AM") {
  try {
    const partes = horaStr.split(" ");
    const tiempo = partes[0] || "10:00";
    const turno = (partes[1] || "AM").toUpperCase();
    const [hora, minuto] = tiempo.split(":");
    return {
      hora: hora ? hora.padStart(2, "0") : "10",
      minuto: minuto || "00",
      turno: turno === "PM" ? "PM" : "AM",
    };
  } catch (e) {
    return { hora: "10", minuto: "00", turno: "AM" };
  }
}

function EstrellasReales({ rating = 0, size = 13 }) {
  const valor = Number(rating) || 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 1.5 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        let iconName = "star-outline";
        if (valor >= star) iconName = "star";
        else if (valor >= star - 0.5) iconName = "star-half";
        return (
          <Ionicons
            key={star}
            name={iconName}
            size={size}
            color={valor > 0 ? "#F59E0B" : "#CBD5E1"}
          />
        );
      })}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("es");
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [modalFotoUsuario, setModalFotoUsuario] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [planUsuario, setPlanUsuario] = useState("esencial");
  const [metodoPagoGuardado, setMetodoPagoGuardado] = useState("");
  const [modalPagoPremium, setModalPagoPremium] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] =
    useState("tarjeta");
  const [titularTarjeta, setTitularTarjeta] = useState("");
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [expiracionTarjeta, setExpiracionTarjeta] = useState("");
  const [cvvTarjeta, setCvvTarjeta] = useState("");
  const [correoPaypal, setCorreoPaypal] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

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

  const [modalDirectorio, setModalDirectorio] = useState(false);
  const [ciudadBusqueda, setCiudadBusqueda] = useState("");
  const [todosEspecialistas, setTodosEspecialistas] = useState([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);
  const [especialistaSeleccionadoPedir, setEspecialistaSeleccionadoPedir] =
    useState(null);
  const [modalidadSolicitada, setModalidadSolicitada] = useState("presencial");
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const [calMesActual, setCalMesActual] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [fechaSeleccionadaCita, setFechaSeleccionadaCita] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [horaCitaPicker, setHoraCitaPicker] = useState("10");
  const [minutoCitaPicker, setMinutoCitaPicker] = useState("00");
  const [turnoCitaPicker, setTurnoCitaPicker] = useState("AM");

  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [aceptandoCitaId, setAceptandoCitaId] = useState(null);
  const [solicitudReprogramando, setSolicitudReprogramando] = useState(null);

  const [calMesReprogramar, setCalMesReprogramar] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [fechaReprogramacion, setFechaReprogramacion] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [horaReprogPicker, setHoraReprogPicker] = useState("10");
  const [minutoReprogPicker, setMinutoReprogPicker] = useState("00");
  const [turnoReprogPicker, setTurnoReprogPicker] = useState("AM");
  const [mensajeReprogramacion, setMensajeReprogramacion] = useState("");
  const [enviandoReprogramacion, setEnviandoReprogramacion] = useState(false);

  const [modalResena, setModalResena] = useState(false);
  const [estrellasResena, setEstrellasResena] = useState(5);
  const [comentarioResena, setComentarioResena] = useState("");
  const [esAnonimaResena, setEsAnonimaResena] = useState(false);
  const [enviandoResena, setEnviandoResena] = useState(false);

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

  const [showHelp, setShowHelp] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const [showConfig, setShowConfig] = useState(false);
  const configRotateAnim = useRef(new Animated.Value(0)).current;

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

  const [activeNav, setActiveNav] = useState(3);

  const [goal, setGoal] = useState("3 chequeos al día");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [calmStreak, setCalmStreak] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

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
      loadMisSolicitudes();
    }, [])
  );

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
        const data = psiSnap.data();
        setPsicologoDetalle(data);
        if (data.nombre) setPsicologoVinculado(data.nombre);
        if (data.especialidad) setPsicologoEspecialidad(data.especialidad);
        setPsicologoFoto(data.fotoPerfil || null);
      }
    } catch (e) {
      console.log("Error cargando detalle del psicólogo:", e);
    }
  };

  const loadProfileData = async () => {
    try {
      const cachedPhoto = await AsyncStorage.getItem(USER_PHOTO_KEY);
      if (cachedPhoto) setFotoPerfil(cachedPhoto);

      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setName(data.nombre ?? "");
        setEmail(data.correo ?? user.email);
        setPhone(data.telefono ?? "");
        if (data.idioma) setLanguage(data.idioma);
        if (data.fotoPerfil) {
          setFotoPerfil(data.fotoPerfil);
          await AsyncStorage.setItem(USER_PHOTO_KEY, data.fotoPerfil);
        }

        const esPlanPremium =
          data.plan === "premium" || data.esPremium === true;
        setPlanUsuario(esPlanPremium ? "premium" : "esencial");
        setMetodoPagoGuardado(data.metodoPagoResumen || "");

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

  const handleConfirmarPagoPremium = async () => {
    const user = auth.currentUser;
    if (!user) return;

    let resumenMetodo = "";

    if (metodoPagoSeleccionado === "tarjeta") {
      const digitos = numeroTarjeta.replace(/\s/g, "");
      if (!titularTarjeta.trim()) {
        Alert.alert(
          "Dato requerido",
          "Ingresa el nombre del titular de la tarjeta."
        );
        return;
      }
      if (digitos.length < 16) {
        Alert.alert(
          "Tarjeta incompleta",
          "Ingresa los 16 dígitos de tu tarjeta de débito o crédito."
        );
        return;
      }
      if (expiracionTarjeta.length < 5) {
        Alert.alert(
          "Fecha requerida",
          "Ingresa la fecha de vencimiento (MM/AA)."
        );
        return;
      }
      if (cvvTarjeta.length < 3) {
        Alert.alert(
          "CVV requerido",
          "Ingresa el código de seguridad de 3 o 4 dígitos."
        );
        return;
      }
      resumenMetodo = `Tarjeta terminación •••• ${digitos.slice(-4)}`;
    } else {
      if (!correoPaypal.trim() || !correoPaypal.includes("@")) {
        Alert.alert(
          "Correo PayPal requerido",
          "Ingresa el correo asociado a tu cuenta de PayPal."
        );
        return;
      }
      resumenMetodo = `PayPal (${correoPaypal.trim()})`;
    }

    try {
      setProcesandoPago(true);
      await new Promise((resolve) => setTimeout(resolve, 900));

      await setDoc(
        doc(db, "usuarios", user.uid),
        {
          plan: "premium",
          planNombre: "Lami Premium",
          esPremium: true,
          precioMensual: 149,
          metodoPagoTipo: metodoPagoSeleccionado,
          metodoPagoResumen: resumenMetodo,
          suscripcionActualizadaEn: serverTimestamp(),
        },
        { merge: true }
      );

      setPlanUsuario("premium");
      setMetodoPagoGuardado(resumenMetodo);
      setModalPagoPremium(false);
      setTitularTarjeta("");
      setNumeroTarjeta("");
      setExpiracionTarjeta("");
      setCvvTarjeta("");
      setCorreoPaypal("");

      Alert.alert(
        "¡Suscripción activada! ✨",
        "Tu cuenta ahora cuenta con Lami Premium ($149 MXN/mes)."
      );
    } catch (error) {
      Alert.alert(
        "Error al procesar",
        error?.message || "No se pudo actualizar tu plan en este momento."
      );
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleCancelarSuscripcionPremium = () => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      "Cancelar suscripción Premium",
      "¿Deseas cancelar tu suscripción a Lami Premium y volver al Plan Esencial gratuito?",
      [
        { text: "Conservar Premium", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              setProcesandoPago(true);
              await setDoc(
                doc(db, "usuarios", user.uid),
                {
                  plan: "esencial",
                  planNombre: "Plan Esencial",
                  esPremium: false,
                  precioMensual: 0,
                  metodoPagoResumen: "",
                  suscripcionCanceladaEn: serverTimestamp(),
                },
                { merge: true }
              );

              setPlanUsuario("esencial");
              setMetodoPagoGuardado("");

              Alert.alert(
                "Suscripción cancelada",
                "Tu cuenta regresó al Plan Esencial gratuito. Puedes reactivar Lami Premium cuando lo desees."
              );
            } catch (error) {
              Alert.alert(
                "Error",
                error?.message || "No se pudo cancelar la suscripción."
              );
            } finally {
              setProcesandoPago(false);
            }
          },
        },
      ]
    );
  };

  const actualizarFotoUsuario = async (base64Uri) => {
    setFotoPerfil(base64Uri);
    try {
      await AsyncStorage.setItem(USER_PHOTO_KEY, base64Uri);
      const user = auth.currentUser;
      if (user) {
        await setDoc(
          doc(db, "usuarios", user.uid),
          {
            fotoPerfil: base64Uri,
            actualizadoEn: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.log("Error guardando foto de perfil:", e);
    }
  };

  const elegirFotoGaleria = async () => {
    setModalFotoUsuario(false);
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        "Permiso requerido",
        "Habilita el permiso de galería para elegir tu fotografía de perfil."
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });

    if (!res.canceled && res.assets?.[0]?.base64) {
      await actualizarFotoUsuario(
        `data:image/jpeg;base64,${res.assets[0].base64}`
      );
    }
  };

  const tomarFotoCamara = async () => {
    setModalFotoUsuario(false);
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        "Permiso requerido",
        "Habilita el permiso de cámara para tomar tu fotografía de perfil."
      );
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });

    if (!res.canceled && res.assets?.[0]?.base64) {
      await actualizarFotoUsuario(
        `data:image/jpeg;base64,${res.assets[0].base64}`
      );
    }
  };

  const handleGuardarDatosPersonales = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Nombre requerido", "Por favor escribe tu nombre.");
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        "Correo requerido",
        "Por favor escribe un correo electrónico válido."
      );
      return;
    }

    try {
      setGuardandoPerfil(true);

      const nuevoCorreo = email.trim();
      if (nuevoCorreo !== user.email) {
        try {
          await updateEmail(user, nuevoCorreo);
        } catch (authErr) {
          if (authErr.code === "auth/requires-recent-login") {
            Alert.alert(
              "Inicio de sesión reciente requerido",
              "Para cambiar tu correo de acceso debes volver a iniciar sesión. Se guardarán el resto de tus datos."
            );
            setEmail(user.email || "");
          } else {
            throw authErr;
          }
        }
      }

      await setDoc(
        doc(db, "usuarios", user.uid),
        {
          nombre: name.trim(),
          correo: auth.currentUser?.email || nuevoCorreo,
          telefono: phone.trim(),
          idioma: language,
          fotoPerfil: fotoPerfil || null,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        "Perfil actualizado 💜",
        "Tus datos personales se guardaron correctamente."
      );
    } catch (error) {
      console.log("Error guardando datos personales:", error);
      Alert.alert(
        "Error al guardar",
        error?.message || "No se pudieron actualizar tus datos."
      );
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const loadMisSolicitudes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "solicitudes_sesion"),
        where("pacienteId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.creadoEn?.seconds || 0;
          const tb = b.creadoEn?.seconds || 0;
          return tb - ta;
        });
      setMisSolicitudes(lista);
    } catch (e) {
      console.log("Error cargando solicitudes:", e);
    }
  };

  const handleAceptarCitaTerapeuta = async (solicitud) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setAceptandoCitaId(solicitud.id);

      let psiData = null;
      if (solicitud.psicologoId) {
        const psiSnap = await getDoc(
          doc(db, "psicologos", solicitud.psicologoId)
        );
        if (psiSnap.exists()) {
          psiData = psiSnap.data();
        }
      }

      const fechaCita =
        solicitud.fechaCita ||
        solicitud.fechaSolicitada ||
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(d.getDate()).padStart(2, "0")}`;
        })();

      const horaCita =
        solicitud.horaCita || solicitud.horaSolicitada || "10:00 AM";
      const esPresencial =
        (solicitud.modalidadConfirmada || solicitud.modalidadSolicitada) !==
        "online";

      const ubicacion =
        solicitud.ubicacionConfirmada || psiData?.ubicacion || null;
      const lugarTexto = esPresencial
        ? ubicacion
          ? `${ubicacion.nombreLugar || "Consultorio privado"} • ${
              ubicacion.direccion
            }${
              ubicacion.pisoConsultorio ? ` (${ubicacion.pisoConsultorio})` : ""
            }${ubicacion.ciudad ? `, ${ubicacion.ciudad}` : ""}`
          : solicitud.lugarCita || "Consulta presencial (confirmar dirección)"
        : "Sesión en línea (Teleconsulta Lami)";

      await updateDoc(doc(db, "solicitudes_sesion", solicitud.id), {
        estado: "cita_aceptada",
        aceptadaEn: serverTimestamp(),
      });

      if (!psicologoVinculado && psiData?.codigoVinculacion) {
        try {
          const resVinc = await vincularConPsicologo(
            user.uid,
            psiData.codigoVinculacion
          );
          setPsicologoId(resVinc.psicologoId);
          setPsicologoVinculado(resVinc.psicologoNombre);
          setPsicologoEspecialidad(resVinc.psicologoEspecialidad || "");
          setPsicologoFoto(resVinc.psicologoFoto);
          loadPsicologoDetalle(resVinc.psicologoId);
        } catch (vincErr) {
          console.log("Vinculación automática opcional:", vincErr);
        }
      }

      const rawCitas = await AsyncStorage.getItem(CITAS_STORAGE_KEY);
      const citasPrevias = rawCitas ? JSON.parse(rawCitas) : {};
      const citasDelDia = Array.isArray(citasPrevias[fechaCita])
        ? citasPrevias[fechaCita]
        : [];

      const nuevaCita = {
        id: solicitud.id,
        fecha: fechaCita,
        hora: horaCita,
        psicologoId: solicitud.psicologoId || "",
        psicologoNombre:
          solicitud.psicologoNombre || psiData?.nombre || "Especialista",
        modalidad: esPresencial ? "Presencial" : "Online",
        esOnline: !esPresencial,
        estado: "cita_aceptada",
        lugar: lugarTexto,
        mensajeTerapeuta: solicitud.respuestaTerapeuta || "",
      };

      const sinDuplicados = citasDelDia.filter((c) => c.id !== solicitud.id);
      citasPrevias[fechaCita] = [...sinDuplicados, nuevaCita];
      await AsyncStorage.setItem(
        CITAS_STORAGE_KEY,
        JSON.stringify(citasPrevias)
      );

      try {
        const permiso = await ensureNotifPermission();
        if (permiso) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Recordatorio de cita psicológica 📅",
              body: `Tienes sesión con ${nuevaCita.psicologoNombre} el ${fechaCita} a las ${horaCita}. ${lugarTexto}`,
            },
            trigger: { seconds: 10 },
          });
        }
      } catch (notifErr) {
        console.log("Recordatorio local omitido en Expo Go:", notifErr);
      }

      await loadMisSolicitudes();

      Alert.alert(
        "Cita guardada en tu calendario ✅",
        `Tu sesión con ${nuevaCita.psicologoNombre} quedó agendada para el ${fechaCita} (${horaCita}). Puedes verla en la pestaña Calendario.`
      );
    } catch (err) {
      Alert.alert("Error", "No se pudo confirmar la cita: " + err.message);
    } finally {
      setAceptandoCitaId(null);
    }
  };

  const handleReenviarPropuestaHorario = async () => {
    if (!solicitudReprogramando) return;

    try {
      setEnviandoReprogramacion(true);
      const horaFormateada = `${horaReprogPicker}:${minutoReprogPicker} ${turnoReprogPicker}`;
      const mensajeOpcional = mensajeReprogramacion.trim();

      const historialPrevio = Array.isArray(
        solicitudReprogramando.historialMensajes
      )
        ? solicitudReprogramando.historialMensajes
        : [];

      const textoNota =
        mensajeOpcional ||
        `Propuesta de nuevo horario: ${fechaReprogramacion} a las ${horaFormateada}`;

      await updateDoc(
        doc(db, "solicitudes_sesion", solicitudReprogramando.id),
        {
          estado: "reprogramacion_solicitada",
          fechaSolicitada: fechaReprogramacion,
          horaSolicitada: horaFormateada,
          mensaje: textoNota,
          historialMensajes: [
            ...historialPrevio,
            {
              autor: "paciente",
              texto: textoNota,
              fecha: new Date().toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ],
          actualizadoEn: serverTimestamp(),
        }
      );

      setSolicitudReprogramando(null);
      setMensajeReprogramacion("");
      await loadMisSolicitudes();

      Alert.alert(
        "Propuesta enviada 🔄",
        `Le enviamos tu propuesta para el ${fechaReprogramacion} a las ${horaFormateada} al especialista para que la revise.`
      );
    } catch (err) {
      Alert.alert("Error", "No se pudo enviar tu propuesta: " + err.message);
    } finally {
      setEnviandoReprogramacion(false);
    }
  };

  const abrirDirectorioEspecialistas = async () => {
    setModalDirectorio(true);
    setEspecialistaSeleccionadoPedir(null);
    try {
      setCargandoDirectorio(true);
      const snap = await getDocs(collection(db, "psicologos"));
      const lista = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter(
          (psi) =>
            typeof psi.nombre === "string" &&
            psi.nombre.trim().length > 2 &&
            (psi.correo || psi.codigoVinculacion || psi.cedulaProfesional)
        );
      setTodosEspecialistas(lista);
    } catch (e) {
      console.log("Error cargando directorio de psicólogos:", e);
      Alert.alert(
        "Aviso",
        "No se pudo cargar el directorio en este momento. Intenta de nuevo."
      );
    } finally {
      setCargandoDirectorio(false);
    }
  };

  const handleEnviarSolicitudSesion = async () => {
    if (!especialistaSeleccionadoPedir) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      setEnviandoSolicitud(true);
      const psi = especialistaSeleccionadoPedir;
      const modPsi = (psi.modalidad || "presencial").toLowerCase();
      const modalidadFinal =
        modPsi === "online"
          ? "online"
          : modPsi === "hybrid" || modPsi === "hibrida"
          ? modalidadSolicitada
          : "presencial";

      const horaFormateada = `${horaCitaPicker}:${minutoCitaPicker} ${turnoCitaPicker}`;
      const mensajeOpcional = mensajeSolicitud.trim();

      await addDoc(collection(db, "solicitudes_sesion"), {
        pacienteId: user.uid,
        pacienteNombre: name.trim() || "Paciente Lami",
        pacienteCorreo: email.trim() || user.email || "",
        pacienteTelefono: phone.trim() || "",
        psicologoId: psi.id,
        psicologoNombre: psi.nombre || "Especialista",
        modalidadSolicitada: modalidadFinal,
        fechaSolicitada: fechaSeleccionadaCita,
        horaSolicitada: horaFormateada,
        mensaje:
          mensajeOpcional ||
          `Solicitud de sesión para el ${fechaSeleccionadaCita} a las ${horaFormateada}.`,
        mensajeOpcional,
        estado: "pendiente",
        respuestaTerapeuta: "",
        creadoEn: serverTimestamp(),
      });

      setEspecialistaSeleccionadoPedir(null);
      setMensajeSolicitud("");
      setModalDirectorio(false);
      await loadMisSolicitudes();

      Alert.alert(
        "Solicitud enviada ✨",
        `Se envió tu solicitud a ${psi.nombre} para el ${fechaSeleccionadaCita} a las ${horaFormateada}.`
      );
    } catch (err) {
      Alert.alert("Error", "No se pudo enviar la solicitud: " + err.message);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const abrirUbicacionEnMapa = (ubicacion) => {
    if (!ubicacion) return;
    const partes = [
      ubicacion.tipoLugar === "hospital_clinica" ? ubicacion.nombreLugar : "",
      ubicacion.direccion,
      ubicacion.ciudad,
    ]
      .filter(Boolean)
      .join(", ");

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      partes
    )}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir la aplicación de mapas.")
    );
  };

  const handleGuardarResena = async () => {
    const user = auth.currentUser;
    if (!user || !psicologoId) return;

    if (!comentarioResena.trim()) {
      Alert.alert(
        "Comentario requerido",
        "Escribe una breve reseña sobre tu experiencia con tu terapeuta."
      );
      return;
    }

    try {
      setEnviandoResena(true);

      const nombreAutor = esAnonimaResena
        ? "Paciente Anónimo"
        : name.trim() || "Paciente Lami";

      const resenaRef = doc(db, "psicologos", psicologoId, "resenas", user.uid);
      await setDoc(resenaRef, {
        pacienteId: user.uid,
        autorNombre: nombreAutor,
        esAnonima: esAnonimaResena,
        calificacion: estrellasResena,
        comentario: comentarioResena.trim(),
        psicologoId,
        psicologoNombre: psicologoVinculado || "",
        creadoEn: serverTimestamp(),
      });

      const todasResenasSnap = await getDocs(
        collection(db, "psicologos", psicologoId, "resenas")
      );
      let suma = 0;
      let total = 0;
      todasResenasSnap.forEach((docItem) => {
        const val = Number(docItem.data()?.calificacion || 0);
        if (val > 0) {
          suma += val;
          total += 1;
        }
      });

      const nuevoPromedio =
        total > 0 ? Number((suma / total).toFixed(1)) : estrellasResena;

      await updateDoc(doc(db, "psicologos", psicologoId), {
        calificacionPromedio: nuevoPromedio,
        totalResenas: total,
      });

      setPsicologoDetalle((prev) =>
        prev
          ? {
              ...prev,
              calificacionPromedio: nuevoPromedio,
              totalResenas: total,
            }
          : prev
      );

      setComentarioResena("");
      setModalResena(false);

      Alert.alert(
        "¡Gracias por tu reseña! 💜",
        esAnonimaResena
          ? "Tu calificación se envió de forma anónima al perfil de tu especialista."
          : "Tu calificación y comentario ya se reflejan en el perfil de tu especialista."
      );
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar la reseña: " + err.message);
    } finally {
      setEnviandoResena(false);
    }
  };

  const abrirConfirmacionDesvincular = () => {
    setModalInfoPsicologo(false);
    setModalConfirmDesvincular(true);
  };

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
              await AsyncStorage.removeItem(USER_PHOTO_KEY);

              setName("");
              setEmail("");
              setPhone("");
              setFotoPerfil(null);

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
              await AsyncStorage.removeItem(USER_PHOTO_KEY);

              setName("");
              setEmail("");
              setPhone("");
              setFotoPerfil(null);

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

  const queryCiudad = normalizarTexto(ciudadBusqueda);
  const especialistasFiltrados = todosEspecialistas.filter((psi) => {
    if (!queryCiudad) return true;
    const ciudadPsi = normalizarTexto(
      psi.ubicacion?.ciudadKey || psi.ubicacion?.ciudad || ""
    );
    const espPsi = normalizarTexto(psi.especialidad || "");
    return ciudadPsi.includes(queryCiudad) || espPsi.includes(queryCiudad);
  });

  const privPsi = {
    ...PRIVACIDAD_PSI_DEFAULT,
    ...(psicologoDetalle?.privacidad || {}),
  };

  const fotoPsiVisible = privPsi.fotoPerfil
    ? psicologoDetalle?.fotoPerfil || psicologoFoto || null
    : null;
  const especialidadPsiVisible = privPsi.especialidad
    ? psicologoDetalle?.especialidad ||
      psicologoEspecialidad ||
      "Psicología Clínica • Red Lami"
    : "Especialista verificado • Red Lami";
  const cedulaPsiVisible = privPsi.cedulaProfesional
    ? psicologoDetalle?.cedulaProfesional || psicologoDetalle?.cedula || null
    : null;
  const ubicacionVinculada = privPsi.ubicacion
    ? psicologoDetalle?.ubicacion || null
    : null;
  const correoPsiVisible = privPsi.correo
    ? psicologoDetalle?.correo || null
    : null;
  const telefonoPsiVisible = privPsi.telefono
    ? psicologoDetalle?.telefono || null
    : null;
  const biografiaPsiVisible = privPsi.biografia
    ? psicologoDetalle?.biografia || psicologoDetalle?.descripcion || null
    : null;

  const totalResenasVinculado = Number(psicologoDetalle?.totalResenas || 0);
  const promedioVinculado =
    totalResenasVinculado > 0
      ? Number(psicologoDetalle?.calificacionPromedio || 0).toFixed(1)
      : "0.0";

  const esPremiumActivo = planUsuario === "premium";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F5FF" }}>
      <LinearGradient
        colors={["#FAF7FF", "#F3EEFF", "#EEF6FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.screen}>
          {/* Barra superior moderna con cápsula activa */}
          <View
            style={[
              styles.navBar,
              {
                paddingTop: insets.top + 8,
              },
            ]}
          >
            {[
              ["stats-chart-outline", "Anxiósometro", "Anxiosimetro"],
              ["calendar-outline", "Calendario", "Calendario"],
              ["heart-outline", "Checking", "Checking"],
              ["person-circle", "Perfil", "Perfil"],
            ].map(([icon, label, screen], i) => {
              const isSelected = activeNav === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  style={[styles.navItem, isSelected && styles.navItemActive]}
                  onPress={() => {
                    setActiveNav(i);
                    navigation.navigate(screen);
                  }}
                >
                  <Ionicons
                    name={icon}
                    size={22}
                    color={isSelected ? "#7C3AED" : "#94A3B8"}
                  />
                  {isSelected && (
                    <Text style={styles.navLabelActive}>{label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Card de Bienvenida */}
            <LinearGradient
              colors={["#FFFFFF", "#F6F1FF", "#EFF6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCard}
            >
              <View style={styles.heroOrbTopRight} />
              <View style={styles.heroOrbBottomLeft} />

              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.helloText}>Bienvenida de nuevo,</Text>
                <Text style={styles.nameBig} numberOfLines={2}>
                  {name || "Usuario Lami"}
                </Text>

                <LinearGradient
                  colors={["#EDE9FE", "#E0F2FE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Ionicons name="sparkles" size={14} color="#6D28D9" />
                  <Text style={styles.badgeText}>Tu espacio privado 💜</Text>
                </LinearGradient>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setModalFotoUsuario(true)}
                style={styles.heroAvatarWrapper}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#3B82F6", "#14B8A6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroAvatarRing}
                >
                  <View style={styles.avatarCircle}>
                    {fotoPerfil ? (
                      <Image
                        source={{ uri: fotoPerfil }}
                        style={styles.userAvatarImage}
                      />
                    ) : (
                      <FontAwesome name="user" size={40} color="#7C3AED" />
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.userCameraBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </LinearGradient>

            {/* Tarjetas de Racha y Sesiones */}
            <View style={styles.statsRow}>
              <LinearGradient
                colors={["#FFFBEB", "#FEF3C7", "#FFE4E6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statCard, { borderColor: "#FDE68A" }]}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: "#92400E" }]}>
                    Racha de calma
                  </Text>
                  <View
                    style={[
                      styles.statIconBubble,
                      { backgroundColor: "rgba(245, 158, 11, 0.16)" },
                    ]}
                  >
                    <Ionicons name="flame" size={16} color="#D97706" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: "#78350F" }]}>
                  {calmStreak} {calmStreak === 1 ? "día" : "días"}
                </Text>
                <Text style={[styles.statHint, { color: "#B45309" }]}>
                  Sigue así, lo haces genial ✨
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={["#EFF6FF", "#EDE9FE", "#F5F3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statCard, { borderColor: "#DDD6FE" }]}
              >
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: "#4338CA" }]}>
                    Sesiones
                  </Text>
                  <View
                    style={[
                      styles.statIconBubble,
                      { backgroundColor: "rgba(124, 58, 237, 0.14)" },
                    ]}
                  >
                    <Ionicons name="headset" size={16} color="#6D28D9" />
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: "#312E81" }]}>
                  {sessionsCount}
                </Text>
                <Text style={[styles.statHint, { color: "#5B21B6" }]}>
                  Tu mente se está cuidando 💜
                </Text>
              </LinearGradient>
            </View>

            {/* Botón Principal de Sesión con Degradado */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={addSession}
              style={styles.sessionButtonShadow}
            >
              <LinearGradient
                colors={["#7C3AED", "#5B21B6", "#4338CA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sessionButton}
              >
                <View style={styles.sessionBtnIconCircle}>
                  <Ionicons name="headset-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.sessionButtonText}>
                  Registrar una sesión completada 🎧
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Card Mi Plan Lami */}
            <View style={styles.card}>
              <View style={styles.cardTitleHeader}>
                <View style={styles.cardTitleLeft}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: "#F3E8FF" },
                    ]}
                  >
                    <Ionicons
                      name="diamond-outline"
                      size={16}
                      color="#7C3AED"
                    />
                  </View>
                  <Text style={styles.sectionTitle}>Mi Plan Lami</Text>
                </View>

                <View
                  style={[
                    styles.planStatusPill,
                    esPremiumActivo
                      ? styles.planStatusPillPremium
                      : styles.planStatusPillFree,
                  ]}
                >
                  <Ionicons
                    name={esPremiumActivo ? "diamond" : "leaf"}
                    size={12}
                    color={esPremiumActivo ? "#6D28D9" : "#0F766E"}
                  />
                  <Text
                    style={[
                      styles.planStatusPillText,
                      { color: esPremiumActivo ? "#6D28D9" : "#0F766E" },
                    ]}
                  >
                    {esPremiumActivo ? "Lami Premium" : "Plan Esencial"}
                  </Text>
                </View>
              </View>

              {esPremiumActivo ? (
                <LinearGradient
                  colors={["#F5F3FF", "#EDE9FE"]}
                  style={styles.planSummaryBoxPremium}
                >
                  <View style={styles.planSummaryHeader}>
                    <Text style={styles.planSummaryName}>
                      Suscripción Lami Premium
                    </Text>
                    <View style={styles.priceTagPremium}>
                      <Text style={styles.planSummaryPrice}>$149 MXN/mes</Text>
                    </View>
                  </View>
                  <Text style={styles.planSummaryDesc}>
                    Tienes activos todos los reportes clínicos avanzados,
                    seguimiento prioritario y recursos exclusivos.
                  </Text>
                  {metodoPagoGuardado ? (
                    <View style={styles.paymentChip}>
                      <Ionicons name="card-outline" size={14} color="#5B21B6" />
                      <Text style={styles.planPaymentMethodText}>
                        {metodoPagoGuardado}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={procesandoPago}
                    onPress={handleCancelarSuscripcionPremium}
                    style={styles.cancelSubBtn}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={16}
                      color="#E11D48"
                    />
                    <Text style={styles.cancelSubBtnText}>
                      {procesandoPago
                        ? "Procesando..."
                        : "Cancelar suscripción"}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View style={styles.planSummaryBoxFree}>
                  <View style={styles.planSummaryHeader}>
                    <Text style={styles.planSummaryName}>
                      Plan Esencial • Gratuito
                    </Text>
                    <View style={styles.priceTagFree}>
                      <Text style={styles.planSummaryPriceFree}>$0 MXN</Text>
                    </View>
                  </View>
                  <Text style={styles.planSummaryDesc}>
                    Incluye Anxiósometro, calendario emocional, bitácora diaria,
                    ejercicios y vinculación con especialista.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setModalPagoPremium(true)}
                    style={{ marginTop: 6 }}
                  >
                    <LinearGradient
                      colors={["#7C3AED", "#4F46E5"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.upgradePremiumBtn}
                    >
                      <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                      <Text style={styles.upgradePremiumBtnText}>
                        Cambiar a Lami Premium ($149/mes)
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Card Mi Especialista */}
            <View style={styles.card}>
              <View style={styles.cardTitleHeader}>
                <View style={styles.cardTitleLeft}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: "#E0F2FE" },
                    ]}
                  >
                    <Ionicons name="medkit-outline" size={16} color="#0284C7" />
                  </View>
                  <Text style={styles.sectionTitle}>Mi Especialista</Text>
                </View>

                {psicologoVinculado && (
                  <View style={styles.activeLinkPill}>
                    <View style={styles.activeLinkDot} />
                    <Text style={styles.activeLinkText}>Enlace activo</Text>
                  </View>
                )}
              </View>

              {psicologoVinculado ? (
                <View style={{ marginTop: 4 }}>
                  <LinearGradient
                    colors={["#F8FAFC", "#EFF6FF", "#F0FDFA"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.especialistaCard}
                  >
                    <LinearGradient
                      colors={["#60A5FA", "#34D399"]}
                      style={styles.avatarRing}
                    >
                      {fotoPsiVisible ? (
                        <Image
                          source={{ uri: fotoPsiVisible }}
                          style={styles.especialistaAvatar}
                        />
                      ) : (
                        <View style={styles.especialistaAvatarPlaceholder}>
                          <Ionicons name="medkit" size={24} color="#4F46E5" />
                        </View>
                      )}
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.especialistaTag}>
                        ACOMPAÑAMIENTO CLÍNICO
                      </Text>
                      <Text style={styles.especialistaName}>
                        {psicologoVinculado}
                      </Text>
                      <Text style={styles.especialistaSpec} numberOfLines={1}>
                        {especialidadPsiVisible}
                      </Text>

                      <View style={styles.miniRatingRow}>
                        <EstrellasReales
                          rating={Number(promedioVinculado)}
                          size={12}
                        />
                        <Text style={styles.miniRatingText}>
                          {promedioVinculado} ({totalResenasVinculado})
                        </Text>
                      </View>

                      {ubicacionVinculada?.ciudad ? (
                        <View style={styles.miniCityRow}>
                          <Ionicons
                            name="location"
                            size={12}
                            color="#0D9488"
                          />
                          <Text style={styles.miniCityText} numberOfLines={1}>
                            {ubicacionVinculada.ciudad}
                            {ubicacionVinculada.pisoConsultorio
                              ? ` • ${ubicacionVinculada.pisoConsultorio}`
                              : ""}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </LinearGradient>

                  <View style={styles.especialistaActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (psicologoId) {
                          loadPsicologoDetalle(psicologoId);
                        }
                        setModalInfoPsicologo(true);
                      }}
                      style={styles.verInfoBtn}
                    >
                      <Ionicons
                        name="person-outline"
                        size={15}
                        color="#1D4ED8"
                      />
                      <Text style={styles.verInfoBtnText}>Ver perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setModalResena(true)}
                      style={styles.calificarBtn}
                    >
                      <Ionicons name="star" size={14} color="#D97706" />
                      <Text style={styles.calificarBtnText}>Calificar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={desvinculando}
                      onPress={abrirConfirmacionDesvincular}
                      style={styles.desvincularBtn}
                    >
                      <Ionicons
                        name="unlink-outline"
                        size={15}
                        color="#E11D48"
                      />
                      <Text style={styles.desvincularBtnText}>
                        {desvinculando ? "..." : "Desvincular"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionSubtitle}>
                    Ingresa el código que te dio tu psicólogo en consulta (ej.
                    PSI-492), escanea su QR o busca especialistas cercanos.
                  </Text>
                  <View style={styles.codeInputContainer}>
                    <View style={styles.inputLeftIcon}>
                      <Ionicons name="key-outline" size={18} color="#4F46E5" />
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          fontWeight: "800",
                          letterSpacing: 2,
                          color: "#1E1B4B",
                        },
                      ]}
                      placeholder="PSI-492"
                      placeholderTextColor="#94A3B8"
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
                        size={20}
                        color="#4F46E5"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
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
                    style={{
                      marginTop: 12,
                      marginBottom: 10,
                      opacity: !codigoPsicologo.trim() ? 0.65 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={["#4F46E5", "#3B82F6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryIndigoBtn}
                    >
                      <Ionicons
                        name="link-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.sessionButtonText}>
                        {vinculando
                          ? "Vinculando..."
                          : "Vincular con mi psicólogo"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.secondaryLinkBtnsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={abrirEscanerQR}
                      style={[styles.qrScanButton, { flex: 1 }]}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={17}
                        color="#4338CA"
                      />
                      <Text style={styles.qrScanButtonText}>Escanear QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={abrirDirectorioEspecialistas}
                      style={[styles.nearbySearchButton, { flex: 1.25 }]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color="#0F766E"
                      />
                      <Text style={styles.nearbySearchButtonText}>
                        Buscar cercanos
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Card Mis Solicitudes y Citas */}
            {misSolicitudes.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleHeader}>
                  <View style={styles.cardTitleLeft}>
                    <View
                      style={[
                        styles.sectionIconBadge,
                        { backgroundColor: "#CCFBF1" },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#0F766E"
                      />
                    </View>
                    <Text style={styles.sectionTitle}>
                      Mis solicitudes y citas
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionSubtitle}>
                  Revisa aquí cuando tu especialista responda o propón otro
                  horario.
                </Text>

                <View style={{ gap: 12 }}>
                  {misSolicitudes.map((sol) => {
                    const estado = sol.estado || "pendiente";
                    const sinCupo = estado === "sin_disponibilidad";
                    const confirmadaPorTerapeuta =
                      estado === "disponible" || estado === "confirmada";
                    const yaAceptada = estado === "cita_aceptada";
                    const esperandoCambio =
                      estado === "reprogramacion_solicitada";

                    return (
                      <View
                        key={sol.id}
                        style={[
                          styles.solicitudCard,
                          sinCupo && styles.solicitudCardNoCupo,
                          (confirmadaPorTerapeuta || yaAceptada) &&
                            styles.solicitudCardOk,
                        ]}
                      >
                        <View style={styles.solicitudTopRow}>
                          <Text style={styles.solicitudPsiName}>
                            {sol.psicologoNombre}
                          </Text>
                          <View
                            style={[
                              styles.solicitudBadge,
                              sinCupo
                                ? { backgroundColor: "#FFE4E6" }
                                : confirmadaPorTerapeuta || yaAceptada
                                ? { backgroundColor: "#CCFBF1" }
                                : esperandoCambio
                                ? { backgroundColor: "#E0E7FF" }
                                : { backgroundColor: "#FEF3C7" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.solicitudBadgeText,
                                sinCupo
                                  ? { color: "#BE123C" }
                                  : confirmadaPorTerapeuta || yaAceptada
                                  ? { color: "#0F766E" }
                                  : esperandoCambio
                                  ? { color: "#4338CA" }
                                  : { color: "#92400E" },
                              ]}
                            >
                              {sinCupo
                                ? "Sin disponibilidad"
                                : yaAceptada
                                ? "En tu calendario"
                                : confirmadaPorTerapeuta
                                ? "Propuesta recibida"
                                : esperandoCambio
                                ? "Cambio enviado"
                                : "Esperando respuesta"}
                            </Text>
                          </View>
                        </View>

                        {sol.respuestaTerapeuta ? (
                          <Text style={styles.solicitudRespuestaText}>
                            💬 "{sol.respuestaTerapeuta}"
                          </Text>
                        ) : (
                          <Text style={styles.solicitudEsperaText}>
                            Solicitud enviada ({sol.modalidadSolicitada}
                            {sol.fechaSolicitada
                              ? ` • ${sol.fechaSolicitada}`
                              : ""}
                            {sol.horaSolicitada
                              ? ` • ${sol.horaSolicitada}`
                              : ""}
                            ). En cuanto el especialista responda, verás su
                            mensaje aquí.
                          </Text>
                        )}

                        {esperandoCambio && sol.mensaje ? (
                          <Text style={styles.solicitudEsperaText}>
                            Tu mensaje: "{sol.mensaje}"
                          </Text>
                        ) : null}

                        {(confirmadaPorTerapeuta || yaAceptada) &&
                          (sol.fechaCita ||
                            sol.horaCita ||
                            sol.fechaSolicitada) && (
                            <Text style={styles.solicitudHorarioText}>
                              🗓️ Propuesta:{" "}
                              {sol.fechaCita ||
                                sol.fechaSolicitada ||
                                "Próxima fecha"}{" "}
                              {sol.horaCita || sol.horaSolicitada
                                ? `• ${sol.horaCita || sol.horaSolicitada}`
                                : ""}
                            </Text>
                          )}

                        {(confirmadaPorTerapeuta || yaAceptada) &&
                        sol.ubicacionConfirmada ? (
                          <View style={styles.locationDetailCard}>
                            <Text style={styles.locationLugarTitle}>
                              📍{" "}
                              {sol.ubicacionConfirmada.nombreLugar ||
                                "Consultorio privado"}
                            </Text>
                            <Text style={styles.infoDetailText}>
                              {sol.ubicacionConfirmada.direccion}
                              {sol.ubicacionConfirmada.pisoConsultorio
                                ? ` (${sol.ubicacionConfirmada.pisoConsultorio})`
                                : ""}
                              {sol.ubicacionConfirmada.ciudad
                                ? `, ${sol.ubicacionConfirmada.ciudad}`
                                : ""}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                abrirUbicacionEnMapa(sol.ubicacionConfirmada)
                              }
                              style={styles.openMapBtn}
                            >
                              <Ionicons
                                name="navigate-outline"
                                size={14}
                                color="#0369A1"
                              />
                              <Text style={styles.openMapBtnText}>
                                Abrir en Google Maps
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {confirmadaPorTerapeuta && (
                          <View style={{ gap: 8, marginTop: 4 }}>
                            {solicitudReprogramando?.id === sol.id ? (
                              <View style={styles.reprogramBox}>
                                <Text style={styles.reprogramTitle}>
                                  Selecciona un nuevo día y hora:
                                </Text>

                                {(() => {
                                  const anio = calMesReprogramar.getFullYear();
                                  const mes = calMesReprogramar.getMonth();
                                  const nombresMes = [
                                    "Enero",
                                    "Febrero",
                                    "Marzo",
                                    "Abril",
                                    "Mayo",
                                    "Junio",
                                    "Julio",
                                    "Agosto",
                                    "Septiembre",
                                    "Octubre",
                                    "Noviembre",
                                    "Diciembre",
                                  ];
                                  const primerDiaSemana = new Date(
                                    anio,
                                    mes,
                                    1
                                  ).getDay();
                                  const totalDiasMes = new Date(
                                    anio,
                                    mes + 1,
                                    0
                                  ).getDate();
                                  const hoy = new Date();
                                  const hoyStr = `${hoy.getFullYear()}-${String(
                                    hoy.getMonth() + 1
                                  ).padStart(2, "0")}-${String(
                                    hoy.getDate()
                                  ).padStart(2, "0")}`;

                                  const celdas = [];
                                  for (let i = 0; i < primerDiaSemana; i++)
                                    celdas.push(null);
                                  for (let d = 1; d <= totalDiasMes; d++)
                                    celdas.push(d);

                                  return (
                                    <View style={styles.miniCalCard}>
                                      <View style={styles.miniCalHeader}>
                                        <TouchableOpacity
                                          onPress={() =>
                                            setCalMesReprogramar(
                                              new Date(anio, mes - 1, 1)
                                            )
                                          }
                                          style={{ padding: 6 }}
                                        >
                                          <Ionicons
                                            name="chevron-back"
                                            size={18}
                                            color="#0F766E"
                                          />
                                        </TouchableOpacity>
                                        <Text style={styles.miniCalMonthTitle}>
                                          {nombresMes[mes]} {anio}
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() =>
                                            setCalMesReprogramar(
                                              new Date(anio, mes + 1, 1)
                                            )
                                          }
                                          style={{ padding: 6 }}
                                        >
                                          <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color="#0F766E"
                                          />
                                        </TouchableOpacity>
                                      </View>

                                      <View style={styles.miniCalWeekRow}>
                                        {[
                                          "Do",
                                          "Lu",
                                          "Ma",
                                          "Mi",
                                          "Ju",
                                          "Vi",
                                          "Sá",
                                        ].map((dw) => (
                                          <Text
                                            key={dw}
                                            style={styles.miniCalWeekText}
                                          >
                                            {dw}
                                          </Text>
                                        ))}
                                      </View>

                                      <View style={styles.miniCalDaysGrid}>
                                        {celdas.map((diaNum, idx) => {
                                          if (!diaNum) {
                                            return (
                                              <View
                                                key={`empty-${idx}`}
                                                style={styles.miniCalCell}
                                              />
                                            );
                                          }
                                          const fechaStr = `${anio}-${String(
                                            mes + 1
                                          ).padStart(2, "0")}-${String(
                                            diaNum
                                          ).padStart(2, "0")}`;
                                          const esPasado = fechaStr < hoyStr;
                                          const seleccionado =
                                            fechaReprogramacion === fechaStr;

                                          return (
                                            <TouchableOpacity
                                              key={fechaStr}
                                              disabled={esPasado}
                                              onPress={() =>
                                                setFechaReprogramacion(
                                                  fechaStr
                                                )
                                              }
                                              style={styles.miniCalCell}
                                            >
                                              <View
                                                style={[
                                                  styles.miniCalDayBubble,
                                                  seleccionado &&
                                                    styles
                                                      .miniCalDayBubbleSelected,
                                                ]}
                                              >
                                                <Text
                                                  style={[
                                                    styles.miniCalDayText,
                                                    esPasado && {
                                                      color: "#CBD5E1",
                                                    },
                                                    seleccionado && {
                                                      color: "#FFFFFF",
                                                      fontWeight: "800",
                                                    },
                                                  ]}
                                                >
                                                  {diaNum}
                                                </Text>
                                              </View>
                                            </TouchableOpacity>
                                          );
                                        })}
                                      </View>
                                    </View>
                                  );
                                })()}

                                <Text style={styles.reprogramTitle}>
                                  Hora seleccionada ({horaReprogPicker}:
                                  {minutoReprogPicker} {turnoReprogPicker})
                                </Text>
                                <View style={styles.timeWheelRow}>
                                  <View style={styles.timeWheelBox}>
                                    <Picker
                                      selectedValue={horaReprogPicker}
                                      onValueChange={(v) =>
                                        setHoraReprogPicker(v)
                                      }
                                    >
                                      {[
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
                                      ].map((h) => (
                                        <Picker.Item
                                          key={h}
                                          label={`${h} hr`}
                                          value={h}
                                        />
                                      ))}
                                    </Picker>
                                  </View>

                                  <View style={styles.timeWheelBox}>
                                    <Picker
                                      selectedValue={minutoReprogPicker}
                                      onValueChange={(v) =>
                                        setMinutoReprogPicker(v)
                                      }
                                    >
                                      {["00", "15", "30", "45"].map((m) => (
                                        <Picker.Item
                                          key={m}
                                          label={`:${m}`}
                                          value={m}
                                        />
                                      ))}
                                    </Picker>
                                  </View>

                                  <View style={styles.timeWheelBoxSmall}>
                                    <Picker
                                      selectedValue={turnoReprogPicker}
                                      onValueChange={(v) =>
                                        setTurnoReprogPicker(v)
                                      }
                                    >
                                      <Picker.Item label="AM" value="AM" />
                                      <Picker.Item label="PM" value="PM" />
                                    </Picker>
                                  </View>
                                </View>

                                <Text style={styles.reprogramTitle}>
                                  Mensaje (opcional):
                                </Text>
                                <TextInput
                                  style={styles.reprogramInput}
                                  multiline
                                  placeholder="Envía mensaje..."
                                  placeholderTextColor="#94A3B8"
                                  value={mensajeReprogramacion}
                                  onChangeText={setMensajeReprogramacion}
                                />
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setSolicitudReprogramando(null);
                                      setMensajeReprogramacion("");
                                    }}
                                    style={styles.reprogramCancelBtn}
                                  >
                                    <Text style={styles.reprogramCancelText}>
                                      Cancelar
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    disabled={enviandoReprogramacion}
                                    onPress={handleReenviarPropuestaHorario}
                                    style={styles.reprogramSendBtn}
                                  >
                                    <Text style={styles.reprogramSendText}>
                                      {enviandoReprogramacion
                                        ? "Enviando..."
                                        : `Proponer el ${fechaReprogramacion}`}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <TouchableOpacity
                                  activeOpacity={0.88}
                                  disabled={aceptandoCitaId === sol.id}
                                  onPress={() =>
                                    handleAceptarCitaTerapeuta(sol)
                                  }
                                  style={[
                                    styles.aceptarCitaBtn,
                                    { flex: 1.3, marginTop: 0 },
                                  ]}
                                >
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={16}
                                    color="#FFFFFF"
                                  />
                                  <Text style={styles.aceptarCitaBtnText}>
                                    {aceptandoCitaId === sol.id
                                      ? "Guardando..."
                                      : "Aceptar cita"}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => {
                                    setSolicitudReprogramando(sol);
                                    setMensajeReprogramacion("");
                                    const baseF =
                                      sol.fechaSolicitada ||
                                      getTomorrowISO();
                                    setFechaReprogramacion(baseF);
                                    const parsed = parseHoraToPicker(
                                      sol.horaSolicitada || "10:00 AM"
                                    );
                                    setHoraReprogPicker(parsed.hora);
                                    setMinutoReprogPicker(parsed.minuto);
                                    setTurnoReprogPicker(parsed.turno);
                                  }}
                                  style={styles.otroHorarioBtn}
                                >
                                  <Ionicons
                                    name="time-outline"
                                    size={15}
                                    color="#4338CA"
                                  />
                                  <Text style={styles.otroHorarioBtnText}>
                                    Otro horario
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Card Datos Personales */}
            <View style={styles.card}>
              <View style={styles.cardTitleHeader}>
                <View style={styles.cardTitleLeft}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: "#EDE9FE" },
                    ]}
                  >
                    <Ionicons name="person-outline" size={16} color="#6D28D9" />
                  </View>
                  <Text style={styles.sectionTitle}>Datos personales</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setModalFotoUsuario(true)}
                  style={styles.changePhotoPill}
                >
                  <Ionicons name="camera-outline" size={13} color="#7C3AED" />
                  <Text style={styles.changePhotoLink}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.labelInline}>Nombre completo</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputLeftIcon}>
                  <MaterialIcons name="person" size={18} color="#7C3AED" />
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={styles.labelInline}>Correo electrónico</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputLeftIcon}>
                  <MaterialIcons name="email" size={18} color="#7C3AED" />
                </View>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={styles.labelInline}>Número celular</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputLeftIcon}>
                  <MaterialIcons
                    name="phone-android"
                    size={18}
                    color="#7C3AED"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Tu número celular"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={styles.labelInline}>Idioma de la aplicación</Text>
              <View style={styles.dropdown}>
                <View style={styles.dropdownIcon}>
                  <Ionicons name="globe-outline" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Picker selectedValue={language} onValueChange={setLanguage}>
                    <Picker.Item label="Español" value="es" />
                    <Picker.Item label="Inglés" value="en" />
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={guardandoPerfil}
                onPress={handleGuardarDatosPersonales}
                style={{
                  marginTop: 18,
                  opacity: guardandoPerfil ? 0.7 : 1,
                }}
              >
                <LinearGradient
                  colors={["#4F46E5", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveProfileBtn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveProfileBtnText}>
                    {guardandoPerfil
                      ? "Guardando cambios..."
                      : "Guardar datos personales"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Card Preferencias & Metas */}
            <LinearGradient
              colors={["#FFFFFF", "#FAF5FF", "#EFF6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardColored}
            >
              <View style={styles.cardTitleHeader}>
                <View style={styles.cardTitleLeft}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: "#FCE7F3" },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={16}
                      color="#DB2777"
                    />
                  </View>
                  <Text style={styles.sectionTitle}>Preferencias & metas</Text>
                </View>
              </View>

              <Text style={styles.labelInline}>Meta diaria de chequeos</Text>
              <View style={styles.chipsRow}>
                {[
                  "3 chequeos al día",
                  "5 chequeos al día",
                  "Solo cuando lo necesite",
                ].map((item) => {
                  const selected = goal === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.85}
                      style={[
                        styles.chipSmall,
                        selected && styles.chipActiveColored,
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
                          selected && styles.chipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.preferenceBox}>
                <View style={styles.preferenceRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.preferenceTitle}>
                      Notificaciones suaves 📲
                    </Text>
                    <Text style={styles.preferenceSubtitle}>
                      Recordatorios amables para cuidar tu bienestar.
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
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
              </View>
            </LinearGradient>

            {/* Card Más Opciones */}
            <LinearGradient
              colors={["#FFFFFF", "#F5F3FF", "#FEFCE8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardColored}
            >
              <View style={styles.cardTitleHeader}>
                <View style={styles.cardTitleLeft}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: "#E0E7FF" },
                    ]}
                  >
                    <Ionicons name="apps-outline" size={16} color="#4338CA" />
                  </View>
                  <Text style={styles.sectionTitle}>Más opciones</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.menuItem}
                onPress={toggleConfig}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#E0F2FE" }]}
                >
                  <Ionicons name="settings-sharp" size={18} color="#0284C7" />
                </View>

                <Text style={styles.menuText}>Configuración</Text>

                <Animated.View
                  style={{
                    marginLeft: "auto",
                    transform: [{ rotate: rotateConfigChevron }],
                  }}
                >
                  <Entypo name="chevron-down" size={20} color="#64748B" />
                </Animated.View>
              </TouchableOpacity>

              {showConfig && (
                <View style={styles.helpContainer}>
                  <Text style={styles.helpQuestion}>Privacidad</Text>

                  <Text style={styles.helpAnswer}>
                    🔒 Tus datos se guardan solo en tu dispositivo.
                  </Text>
                  <Text style={[styles.helpAnswer, { marginTop: 4 }]}>
                    🔒 No compartimos información con terceros.
                  </Text>
                  <Text style={[styles.helpAnswer, { marginTop: 4 }]}>
                    🔒 Puedes borrar toda tu información cuando desees.
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.helpQuestion}>Información</Text>
                    <Text style={styles.helpAnswer}>Anxiously</Text>
                    <Text style={styles.helpAnswer}>Versión 2.0.0</Text>
                    <Text style={[styles.helpAnswer, { marginTop: 6 }]}>
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
                          paddingVertical: 7,
                          paddingHorizontal: 16,
                          borderRadius: 20,
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
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
                          backgroundColor: "#E2E8F0",
                          paddingVertical: 7,
                          paddingHorizontal: 16,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: "#334155", fontWeight: "700" }}>
                          No 🤍
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {feedbackMsg !== "" && (
                      <View
                        style={{
                          marginTop: 12,
                          backgroundColor: "#F5F3FF",
                          padding: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "#DDD6FE",
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

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.menuItem}
                onPress={toggleHelp}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#FEF3C7" }]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={19}
                    color="#D97706"
                  />
                </View>

                <Text style={styles.menuText}>Centro de ayuda</Text>

                <Animated.View
                  style={{
                    marginLeft: "auto",
                    transform: [{ rotate: rotateChevron }],
                  }}
                >
                  <Entypo name="chevron-down" size={20} color="#64748B" />
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

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.menuItem}
                onPress={handleDeleteAccount}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#FEE2E2" }]}
                >
                  <Ionicons name="warning-outline" size={18} color="#DC2626" />
                </View>
                <Text style={[styles.menuText, { color: "#DC2626" }]}>
                  Eliminar cuenta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
              >
                <View
                  style={[styles.iconBubble, { backgroundColor: "#F1F5F9" }]}
                >
                  <Ionicons name="log-out-outline" size={18} color="#334155" />
                </View>
                <Text style={[styles.menuText, { color: "#1E293B" }]}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Modal Pago Lami Premium */}
      <Modal
        visible={modalPagoPremium}
        transparent
        animationType="slide"
        onRequestClose={() => setModalPagoPremium(false)}
      >
        <View style={styles.dirModalOverlay}>
          <View style={styles.payModalCard}>
            <View style={styles.modalHandleBar} />
            <View style={styles.dirModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dirModalTitle}>Lami Premium ✨</Text>
                <Text style={styles.dirModalSubtitle}>
                  Suscripción mensual • $149 MXN/mes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalPagoPremium(false)}
                style={styles.dirModalClose}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
            >
              <View style={styles.payBenefitsBox}>
                <Text style={styles.payBenefitsTitle}>
                  ¿Qué incluye Lami Premium?
                </Text>
                <Text style={styles.payBenefitItem}>
                  • Reportes avanzados de evolución emocional
                </Text>
                <Text style={styles.payBenefitItem}>
                  • Ejercicios guiados y recursos exclusivos
                </Text>
                <Text style={styles.payBenefitItem}>
                  • Puedes cancelar tu suscripción cuando quieras
                </Text>
              </View>

              <Text style={styles.agendarLabel}>Selecciona método de pago</Text>
              <View style={styles.payMethodRow}>
                <TouchableOpacity
                  onPress={() => setMetodoPagoSeleccionado("tarjeta")}
                  style={[
                    styles.payMethodBtn,
                    metodoPagoSeleccionado === "tarjeta" &&
                      styles.payMethodBtnActive,
                  ]}
                >
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={
                      metodoPagoSeleccionado === "tarjeta"
                        ? "#FFFFFF"
                        : "#4338CA"
                    }
                  />
                  <Text
                    style={[
                      styles.payMethodBtnText,
                      metodoPagoSeleccionado === "tarjeta" && {
                        color: "#FFFFFF",
                      },
                    ]}
                  >
                    Tarjeta Débito / Crédito
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMetodoPagoSeleccionado("paypal")}
                  style={[
                    styles.payMethodBtn,
                    metodoPagoSeleccionado === "paypal" &&
                      styles.payMethodBtnActive,
                  ]}
                >
                  <Ionicons
                    name="logo-paypal"
                    size={18}
                    color={
                      metodoPagoSeleccionado === "paypal"
                        ? "#FFFFFF"
                        : "#4338CA"
                    }
                  />
                  <Text
                    style={[
                      styles.payMethodBtnText,
                      metodoPagoSeleccionado === "paypal" && {
                        color: "#FFFFFF",
                      },
                    ]}
                  >
                    PayPal
                  </Text>
                </TouchableOpacity>
              </View>

              {metodoPagoSeleccionado === "tarjeta" ? (
                <View style={styles.payFormBox}>
                  <Text style={styles.payFieldLabel}>Nombre del titular</Text>
                  <TextInput
                    style={styles.payInput}
                    placeholder="Nombre como aparece en la tarjeta"
                    placeholderTextColor="#94A3B8"
                    value={titularTarjeta}
                    onChangeText={setTitularTarjeta}
                  />

                  <Text style={styles.payFieldLabel}>Número de tarjeta</Text>
                  <TextInput
                    style={styles.payInput}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={19}
                    value={numeroTarjeta}
                    onChangeText={(t) =>
                      setNumeroTarjeta(formatearNumeroTarjeta(t))
                    }
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payFieldLabel}>Vencimiento</Text>
                      <TextInput
                        style={styles.payInput}
                        placeholder="MM/AA"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={expiracionTarjeta}
                        onChangeText={(t) =>
                          setExpiracionTarjeta(formatearExpiracion(t))
                        }
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.payFieldLabel}>CVV</Text>
                      <TextInput
                        style={styles.payInput}
                        placeholder="123"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={4}
                        value={cvvTarjeta}
                        onChangeText={(t) =>
                          setCvvTarjeta(t.replace(/\D/g, "").slice(0, 4))
                        }
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.payFormBox}>
                  <Text style={styles.payFieldLabel}>
                    Correo electrónico de PayPal
                  </Text>
                  <TextInput
                    style={styles.payInput}
                    placeholder="tu-cuenta@paypal.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={correoPaypal}
                    onChangeText={setCorreoPaypal}
                  />
                  <Text style={styles.payPaypalHint}>
                    Se vinculará tu cuenta de PayPal para la suscripción mensual
                    de Lami Premium.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={procesandoPago}
                onPress={handleConfirmarPagoPremium}
                style={{ marginTop: 4 }}
              >
                <LinearGradient
                  colors={["#7C3AED", "#4F46E5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.agendarSubmitBtn}
                >
                  <Text style={styles.agendarSubmitText}>
                    {procesandoPago
                      ? "Procesando pago..."
                      : "Pagar $149 MXN y activar Premium"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Foto de Perfil */}
      <Modal
        visible={modalFotoUsuario}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFotoUsuario(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.photoModalCard}>
            <Text style={styles.photoModalTitle}>Foto de perfil</Text>
            <Text style={styles.photoModalSubtitle}>
              Elige cómo deseas actualizar tu imagen
            </Text>

            <TouchableOpacity
              style={styles.photoModalOption}
              onPress={tomarFotoCamara}
            >
              <View style={styles.photoOptionIconBox}>
                <Ionicons name="camera-outline" size={22} color="#4F46E5" />
              </View>
              <Text style={styles.photoModalOptionText}>Tomar fotografía</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoModalOption}
              onPress={elegirFotoGaleria}
            >
              <View style={styles.photoOptionIconBox}>
                <Ionicons name="images-outline" size={22} color="#0D9488" />
              </View>
              <Text style={styles.photoModalOptionText}>
                Elegir de la galería
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoModalCancel}
              onPress={() => setModalFotoUsuario(false)}
            >
              <Text style={styles.photoModalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Perfil del Psicólogo */}
      <Modal
        visible={modalInfoPsicologo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfoPsicologo(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <LinearGradient
                colors={["#EFF6FF", "#F0FDFA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoModalTopBanner}
              >
                <TouchableOpacity
                  onPress={() => setModalInfoPsicologo(false)}
                  style={styles.infoModalClose}
                >
                  <Ionicons name="close" size={20} color="#1E3A8A" />
                </TouchableOpacity>

                <View style={styles.infoModalAvatarRing}>
                  {fotoPsiVisible ? (
                    <Image
                      source={{ uri: fotoPsiVisible }}
                      style={styles.infoModalAvatar}
                    />
                  ) : (
                    <View style={styles.infoModalAvatarPlaceholder}>
                      <Ionicons name="medkit" size={32} color="#4F46E5" />
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
                  {especialidadPsiVisible}
                </Text>

                <View style={styles.ratingBadgeTop}>
                  <EstrellasReales
                    rating={Number(promedioVinculado)}
                    size={13}
                  />
                  <Text style={styles.ratingBadgeTopText}>
                    {promedioVinculado} ({totalResenasVinculado} reseñas)
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.infoModalBody}>
                <View style={styles.infoModalDetailsBox}>
                  {biografiaPsiVisible ? (
                    <View style={styles.infoDetailRow}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text style={styles.infoDetailText}>
                        {biografiaPsiVisible}
                      </Text>
                    </View>
                  ) : null}

                  {cedulaPsiVisible ? (
                    <View style={styles.infoDetailRow}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text style={styles.infoDetailText}>
                        Cédula profesional:{" "}
                        <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                          {cedulaPsiVisible}
                        </Text>
                      </Text>
                    </View>
                  ) : null}

                  {psicologoDetalle?.codigoVinculacion && (
                    <View style={styles.infoDetailRow}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons
                          name="key-outline"
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text style={styles.infoDetailText}>
                        Código de enlace:{" "}
                        <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                          {psicologoDetalle.codigoVinculacion}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {ubicacionVinculada ? (
                    <View style={styles.locationDetailCard}>
                      <View style={styles.infoDetailRow}>
                        <View
                          style={[
                            styles.detailIconCircle,
                            { backgroundColor: "#E0F2FE" },
                          ]}
                        >
                          <Ionicons
                            name={
                              ubicacionVinculada.tipoLugar ===
                              "hospital_clinica"
                                ? "business-outline"
                                : "home-outline"
                            }
                            size={16}
                            color="#0284C7"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationLugarTitle}>
                            {ubicacionVinculada.nombreLugar ||
                              "Consultorio privado"}
                          </Text>
                          <Text style={styles.infoDetailText}>
                            {ubicacionVinculada.direccion}
                            {ubicacionVinculada.ciudad
                              ? `, ${ubicacionVinculada.ciudad}`
                              : ""}
                          </Text>
                          {ubicacionVinculada.pisoConsultorio ? (
                            <Text style={styles.locationFloorText}>
                              📍 {ubicacionVinculada.pisoConsultorio}
                            </Text>
                          ) : null}
                          {ubicacionVinculada.referencia ? (
                            <Text style={styles.locationRefText}>
                              Ref: {ubicacionVinculada.referencia}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => abrirUbicacionEnMapa(ubicacionVinculada)}
                        style={styles.openMapBtn}
                      >
                        <Ionicons
                          name="navigate-outline"
                          size={15}
                          color="#0369A1"
                        />
                        <Text style={styles.openMapBtnText}>
                          Abrir en Google Maps
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {correoPsiVisible && (
                    <View style={styles.infoDetailRow}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons
                          name="mail-outline"
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text style={styles.infoDetailText}>
                        {correoPsiVisible}
                      </Text>
                    </View>
                  )}

                  {telefonoPsiVisible && (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`tel:${telefonoPsiVisible}`)
                      }
                      style={styles.infoDetailRow}
                    >
                      <View style={styles.detailIconCircle}>
                        <Ionicons
                          name="call-outline"
                          size={16}
                          color="#4F46E5"
                        />
                      </View>
                      <Text
                        style={[
                          styles.infoDetailText,
                          {
                            textDecorationLine: "underline",
                            color: "#1D4ED8",
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {telefonoPsiVisible}
                      </Text>
                    </TouchableOpacity>
                  )}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Directorio Especialistas Cercanos */}
      <Modal
        visible={modalDirectorio}
        transparent
        animationType="slide"
        onRequestClose={() => setModalDirectorio(false)}
      >
        <View style={styles.dirModalOverlay}>
          <View style={styles.dirModalCard}>
            <View style={styles.modalHandleBar} />
            <View style={styles.dirModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dirModalTitle}>
                  Especialistas cercanos 🩺
                </Text>
                <Text style={styles.dirModalSubtitle}>
                  Explora terapeutas registrados y solicita tu primera sesión
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalDirectorio(false)}
                style={styles.dirModalClose}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.dirSearchBox}>
              <Ionicons name="search-outline" size={18} color="#0D9488" />
              <TextInput
                style={styles.dirSearchInput}
                placeholder="Escribe tu ciudad"
                placeholderTextColor="#94A3B8"
                value={ciudadBusqueda}
                onChangeText={setCiudadBusqueda}
              />
              {ciudadBusqueda !== "" && (
                <TouchableOpacity onPress={() => setCiudadBusqueda("")}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {!cargandoDirectorio && (
              <View style={styles.dirCountPill}>
                <Ionicons name="sparkles" size={13} color="#0F766E" />
                <Text style={styles.dirCountText}>
                  {especialistasFiltrados.length === 1
                    ? `Hay 1 especialista disponible${
                        ciudadBusqueda.trim()
                          ? ` en ${ciudadBusqueda.trim()}`
                          : ""
                      }`
                    : `Hay ${especialistasFiltrados.length} especialistas disponibles${
                        ciudadBusqueda.trim()
                          ? ` en ${ciudadBusqueda.trim()}`
                          : ""
                      }`}
                </Text>
              </View>
            )}

            {cargandoDirectorio ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={{ color: "#64748B", marginTop: 10 }}>
                  Buscando especialistas...
                </Text>
              </View>
            ) : especialistaSeleccionadoPedir ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.agendarBox}>
                  <TouchableOpacity
                    onPress={() => setEspecialistaSeleccionadoPedir(null)}
                    style={styles.backToListBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color="#0F766E" />
                    <Text style={styles.backToListText}>
                      Volver a la lista
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.agendarTitle}>
                    Pedir sesión con {especialistaSeleccionadoPedir.nombre}
                  </Text>
                  <Text style={styles.agendarHint}>
                    Elige el día y la hora que prefieres. Cuando el especialista
                    acepte, la cita se agregará automáticamente a su agenda y a
                    tu calendario.
                  </Text>

                  {(() => {
                    const modPsi = (
                      especialistaSeleccionadoPedir.modalidad || "presencial"
                    ).toLowerCase();
                    const esHibrido =
                      modPsi === "hybrid" || modPsi === "hibrida";

                    if (!esHibrido) {
                      const esSoloOnline = modPsi === "online";
                      return (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            backgroundColor: "#FFFFFF",
                            padding: 11,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#99F6E4",
                            marginBottom: 14,
                          }}
                        >
                          <Ionicons
                            name={
                              esSoloOnline
                                ? "videocam-outline"
                                : "business-outline"
                            }
                            size={17}
                            color="#0D9488"
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: "#0F766E",
                            }}
                          >
                            Modalidad:{" "}
                            {esSoloOnline ? "100% En línea" : "100% Presencial"}
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <>
                        <Text style={styles.agendarLabel}>
                          Modalidad preferida
                        </Text>
                        <View style={styles.agendarModRow}>
                          {[
                            ["presencial", "Presencial"],
                            ["online", "En línea"],
                          ].map(([val, lbl]) => (
                            <TouchableOpacity
                              key={val}
                              onPress={() => setModalidadSolicitada(val)}
                              style={[
                                styles.agendarModBtn,
                                modalidadSolicitada === val &&
                                  styles.agendarModBtnActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.agendarModText,
                                  modalidadSolicitada === val &&
                                    styles.agendarModTextActive,
                                ]}
                              >
                                {lbl}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    );
                  })()}

                  <Text style={styles.agendarLabel}>
                    Selecciona el día en el calendario
                  </Text>
                  {(() => {
                    const anio = calMesActual.getFullYear();
                    const mes = calMesActual.getMonth();
                    const nombresMes = [
                      "Enero",
                      "Febrero",
                      "Marzo",
                      "Abril",
                      "Mayo",
                      "Junio",
                      "Julio",
                      "Agosto",
                      "Septiembre",
                      "Octubre",
                      "Noviembre",
                      "Diciembre",
                    ];
                    const primerDiaSemana = new Date(anio, mes, 1).getDay();
                    const totalDiasMes = new Date(anio, mes + 1, 0).getDate();
                    const hoy = new Date();
                    const hoyStr = `${hoy.getFullYear()}-${String(
                      hoy.getMonth() + 1
                    ).padStart(2, "0")}-${String(hoy.getDate()).padStart(
                      2,
                      "0"
                    )}`;

                    const celdas = [];
                    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
                    for (let d = 1; d <= totalDiasMes; d++) celdas.push(d);

                    return (
                      <View style={styles.miniCalCard}>
                        <View style={styles.miniCalHeader}>
                          <TouchableOpacity
                            onPress={() =>
                              setCalMesActual(new Date(anio, mes - 1, 1))
                            }
                            style={{ padding: 6 }}
                          >
                            <Ionicons
                              name="chevron-back"
                              size={18}
                              color="#0F766E"
                            />
                          </TouchableOpacity>
                          <Text style={styles.miniCalMonthTitle}>
                            {nombresMes[mes]} {anio}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setCalMesActual(new Date(anio, mes + 1, 1))
                            }
                            style={{ padding: 6 }}
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#0F766E"
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.miniCalWeekRow}>
                          {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map(
                            (dw) => (
                              <Text key={dw} style={styles.miniCalWeekText}>
                                {dw}
                              </Text>
                            )
                          )}
                        </View>

                        <View style={styles.miniCalDaysGrid}>
                          {celdas.map((diaNum, idx) => {
                            if (!diaNum) {
                              return (
                                <View
                                  key={`empty-${idx}`}
                                  style={styles.miniCalCell}
                                />
                              );
                            }
                            const fechaStr = `${anio}-${String(
                              mes + 1
                            ).padStart(2, "0")}-${String(diaNum).padStart(
                              2,
                              "0"
                            )}`;
                            const esPasado = fechaStr < hoyStr;
                            const seleccionado =
                              fechaSeleccionadaCita === fechaStr;

                            return (
                              <TouchableOpacity
                                key={fechaStr}
                                disabled={esPasado}
                                onPress={() =>
                                  setFechaSeleccionadaCita(fechaStr)
                                }
                                style={styles.miniCalCell}
                              >
                                <View
                                  style={[
                                    styles.miniCalDayBubble,
                                    seleccionado &&
                                      styles.miniCalDayBubbleSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniCalDayText,
                                      esPasado && { color: "#CBD5E1" },
                                      seleccionado && {
                                        color: "#FFFFFF",
                                        fontWeight: "800",
                                      },
                                    ]}
                                  >
                                    {diaNum}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  <Text style={styles.agendarLabel}>
                    Selecciona la hora ({horaCitaPicker}:{minutoCitaPicker}{" "}
                    {turnoCitaPicker})
                  </Text>
                  <View style={styles.timeWheelRow}>
                    <View style={styles.timeWheelBox}>
                      <Picker
                        selectedValue={horaCitaPicker}
                        onValueChange={(v) => setHoraCitaPicker(v)}
                      >
                        {[
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
                        ].map((h) => (
                          <Picker.Item key={h} label={`${h} hr`} value={h} />
                        ))}
                      </Picker>
                    </View>

                    <View style={styles.timeWheelBox}>
                      <Picker
                        selectedValue={minutoCitaPicker}
                        onValueChange={(v) => setMinutoCitaPicker(v)}
                      >
                        {["00", "15", "30", "45"].map((m) => (
                          <Picker.Item key={m} label={`:${m}`} value={m} />
                        ))}
                      </Picker>
                    </View>

                    <View style={styles.timeWheelBoxSmall}>
                      <Picker
                        selectedValue={turnoCitaPicker}
                        onValueChange={(v) => setTurnoCitaPicker(v)}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>

                  <Text style={styles.agendarLabel}>Mensaje (opcional)</Text>
                  <TextInput
                    style={[styles.agendarInput, { minHeight: 68 }]}
                    multiline
                    placeholder="Envía mensaje..."
                    placeholderTextColor="#94A3B8"
                    value={mensajeSolicitud}
                    onChangeText={setMensajeSolicitud}
                  />

                  <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={enviandoSolicitud}
                    onPress={handleEnviarSolicitudSesion}
                    style={{ marginTop: 14 }}
                  >
                    <LinearGradient
                      colors={["#0D9488", "#0284C7"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.agendarSubmitBtn}
                    >
                      <Text style={styles.agendarSubmitText}>
                        {enviandoSolicitud
                          ? "Enviando solicitud..."
                          : `Solicitar el ${fechaSeleccionadaCita} • ${horaCitaPicker}:${minutoCitaPicker} ${turnoCitaPicker}`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
              >
                {especialistasFiltrados.length === 0 ? (
                  <View style={styles.emptyDirBox}>
                    <Ionicons
                      name="location-outline"
                      size={32}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyDirTitle}>
                      No encontramos especialistas en esa búsqueda
                    </Text>
                    <Text style={styles.emptyDirDesc}>
                      Intenta escribir otra ciudad cercana o borra el filtro
                      para ver todos los disponibles.
                    </Text>
                  </View>
                ) : (
                  especialistasFiltrados.map((psi) => {
                    const ub = psi.ubicacion;
                    const modRaw = (psi.modalidad || "presencial").toLowerCase();
                    const modLabel =
                      modRaw === "online"
                        ? "100% Online"
                        : modRaw === "hybrid" || modRaw === "hibrida"
                        ? "Híbrida"
                        : "Presencial";

                    const totalRes = Number(psi.totalResenas || 0);
                    const ratingVal =
                      totalRes > 0
                        ? Number(psi.calificacionPromedio || 0)
                        : 0;

                    return (
                      <View key={psi.id} style={styles.dirPsiCard}>
                        <View style={styles.dirPsiTopRow}>
                          {psi.fotoPerfil &&
                          psi.privacidad?.fotoPerfil !== false ? (
                            <Image
                              source={{ uri: psi.fotoPerfil }}
                              style={styles.dirPsiAvatar}
                            />
                          ) : (
                            <View style={styles.dirPsiAvatarPlaceholder}>
                              <Ionicons
                                name="person"
                                size={22}
                                color="#4F46E5"
                              />
                            </View>
                          )}

                          <View style={{ flex: 1 }}>
                            <Text style={styles.dirPsiName}>{psi.nombre}</Text>
                            <Text style={styles.dirPsiSpec}>
                              {psi.privacidad?.especialidad !== false
                                ? psi.especialidad || "Psicología Clínica"
                                : "Especialista verificado"}
                            </Text>
                            <View style={styles.dirPsiBadgesRow}>
                              <View style={styles.dirModBadge}>
                                <Text style={styles.dirModBadgeText}>
                                  {modLabel}
                                </Text>
                              </View>
                              <View style={styles.dirStarBadge}>
                                <EstrellasReales rating={ratingVal} size={11} />
                                <Text style={styles.dirStarText}>
                                  {ratingVal.toFixed(1)} ({totalRes})
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {ub && psi.privacidad?.ubicacion !== false ? (
                          <View style={styles.dirAddressBox}>
                            <Ionicons
                              name="location-outline"
                              size={15}
                              color="#0D9488"
                              style={{ marginTop: 1 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dirAddressPlace}>
                                {ub.ciudad} •{" "}
                                {ub.tipoLugar === "hospital_clinica"
                                  ? "Clínica / Hospital"
                                  : "Consultorio privado"}
                              </Text>
                              <Text style={styles.dirAddressLine}>
                                La dirección exacta se comparte cuando el
                                especialista acepte agendar tu sesión.
                              </Text>
                            </View>
                          </View>
                        ) : modRaw === "online" ? (
                          <Text style={styles.dirOnlineNote}>
                            💻 Atención en modalidad en línea
                          </Text>
                        ) : (
                          <Text style={styles.dirOnlineNote}>
                            🩺 Consulta {modLabel.toLowerCase()} (ubicación se
                            comparte al aceptar la cita)
                          </Text>
                        )}

                        <View style={styles.dirPsiFooterRow}>
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => {
                              setEspecialistaSeleccionadoPedir(psi);
                              setModalidadSolicitada(
                                modRaw === "online" ? "online" : "presencial"
                              );
                            }}
                            style={styles.dirRequestBtn}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.dirRequestBtnText}>
                              Pedir sesión
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Calificar / Reseña */}
      <Modal
        visible={modalResena}
        transparent
        animationType="fade"
        onRequestClose={() => setModalResena(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.reviewModalCard}>
            <TouchableOpacity
              onPress={() => setModalResena(false)}
              style={styles.infoModalClose}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>

            <View style={styles.reviewIconCircle}>
              <Ionicons name="star" size={28} color="#F59E0B" />
            </View>

            <Text style={styles.reviewBadge}>TU OPINIÓN IMPORTA</Text>
            <Text style={styles.reviewTitle}>
              Califica a {psicologoVinculado}
            </Text>
            <Text style={styles.reviewSubtitle}>
              Tu comentario ayudará a otros pacientes y se reflejará en el
              perfil de tu especialista.
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setEstrellasResena(num)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={num <= estrellasResena ? "star" : "star-outline"}
                    size={34}
                    color={num <= estrellasResena ? "#F59E0B" : "#CBD5E1"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              multiline
              placeholder="Envía mensaje..."
              placeholderTextColor="#94A3B8"
              value={comentarioResena}
              onChangeText={setComentarioResena}
            />

            <View style={styles.anonToggleRow}>
              <TouchableOpacity
                onPress={() => setEsAnonimaResena(false)}
                style={[
                  styles.anonOptionBtn,
                  !esAnonimaResena && styles.anonOptionBtnActive,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={!esAnonimaResena ? "#FFFFFF" : "#475569"}
                />
                <Text
                  style={[
                    styles.anonOptionText,
                    !esAnonimaResena && styles.anonOptionTextActive,
                  ]}
                >
                  Con mi nombre
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEsAnonimaResena(true)}
                style={[
                  styles.anonOptionBtn,
                  esAnonimaResena && styles.anonOptionBtnActive,
                ]}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={15}
                  color={esAnonimaResena ? "#FFFFFF" : "#475569"}
                />
                <Text
                  style={[
                    styles.anonOptionText,
                    esAnonimaResena && styles.anonOptionTextActive,
                  ]}
                >
                  Reseña anónima
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={enviandoResena}
              onPress={handleGuardarResena}
              style={{ width: "100%", marginTop: 14 }}
            >
              <LinearGradient
                colors={["#0D9488", "#0284C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.agendarSubmitBtn}
              >
                <Text style={styles.agendarSubmitText}>
                  {enviandoResena
                    ? "Publicando reseña..."
                    : "Enviar calificación"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar Desvincular */}
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

      {/* Escáner QR */}
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
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
    shadowColor: "#4C1D95",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: SCREEN_WIDTH * 0.2,
  },
  navItemActive: {
    backgroundColor: "#F3E8FF",
  },
  navLabelActive: {
    color: "#6D28D9",
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "800",
  },

  headerCard: {
    flexDirection: "row",
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroOrbTopRight: {
    position: "absolute",
    top: -32,
    right: -24,
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: "rgba(196, 181, 253, 0.22)",
  },
  heroOrbBottomLeft: {
    position: "absolute",
    bottom: -40,
    left: 20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(186, 230, 253, 0.26)",
  },
  helloText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#64748B",
  },
  nameBig: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.4,
    marginTop: 1,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  badgeText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#4338CA",
    fontWeight: "700",
  },

  heroAvatarWrapper: {
    position: "relative",
    marginLeft: 10,
  },
  heroAvatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  userAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  userCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  statHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  sessionButtonShadow: {
    marginBottom: 16,
    borderRadius: 18,
    shadowColor: "#6D28D9",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  sessionButton: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sessionBtnIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryIndigoBtn: {
    flexDirection: "row",
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sessionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#312E81",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardColored: {
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#312E81",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 10,
  },

  planStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planStatusPillFree: {
    backgroundColor: "#CCFBF1",
  },
  planStatusPillPremium: {
    backgroundColor: "#EDE9FE",
  },
  planStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  planSummaryBoxFree: {
    marginTop: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 7,
  },
  planSummaryBoxPremium: {
    marginTop: 4,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    gap: 7,
  },
  planSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planSummaryName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  priceTagPremium: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priceTagFree: {
    backgroundColor: "#E6FFFA",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  planSummaryPrice: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#6D28D9",
  },
  planSummaryPriceFree: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F766E",
  },
  planSummaryDesc: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 2,
  },
  planPaymentMethodText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#5B21B6",
  },
  upgradePremiumBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 15,
  },
  upgradePremiumBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  cancelSubBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  cancelSubBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#E11D48",
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
    padding: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  avatarRing: {
    padding: 2.5,
    borderRadius: 32,
    marginRight: 13,
  },
  especialistaAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  especialistaAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  especialistaTag: {
    fontSize: 10,
    color: "#1D4ED8",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  especialistaName: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  especialistaSpec: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "600",
    marginTop: 1,
  },
  miniRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  miniRatingText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  miniCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  miniCityText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0F766E",
  },
  especialistaActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  verInfoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10.5,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  verInfoBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  calificarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10.5,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  calificarBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B45309",
  },
  desvincularBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10.5,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  desvincularBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#E11D48",
  },

  codeInputContainer: {
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  secondaryLinkBtnsRow: {
    flexDirection: "row",
    gap: 8,
  },
  qrScanInlineBtn: {
    padding: 7,
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
  },
  qrScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11.5,
    borderRadius: 15,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  qrScanButtonText: {
    color: "#4338CA",
    fontWeight: "700",
    fontSize: 13,
  },
  nearbySearchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11.5,
    borderRadius: 15,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  nearbySearchButtonText: {
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 13,
  },

  solicitudCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 7,
  },
  solicitudCardOk: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  solicitudCardNoCupo: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  solicitudTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  solicitudPsiName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
  },
  solicitudBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  solicitudBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  solicitudRespuestaText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 18,
    fontStyle: "italic",
  },
  solicitudEsperaText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  solicitudHorarioText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F766E",
  },
  aceptarCitaBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D9488",
    paddingVertical: 10.5,
    borderRadius: 13,
  },
  aceptarCitaBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  otroHorarioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingVertical: 10.5,
    borderRadius: 13,
  },
  otroHorarioBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  reprogramBox: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 8,
  },
  reprogramTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  reprogramInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    padding: 9,
    fontSize: 12.5,
    minHeight: 60,
    textAlignVertical: "top",
    color: "#1E293B",
  },
  reprogramCancelBtn: {
    flex: 1,
    paddingVertical: 9.5,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  reprogramCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  reprogramSendBtn: {
    flex: 1.4,
    paddingVertical: 9.5,
    borderRadius: 11,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  reprogramSendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  labelInline: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
  },
  changePhotoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  changePhotoLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 6,
  },
  inputLeftIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: "#1E293B",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  dropdownIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13.5,
    borderRadius: 16,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveProfileBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chipSmall: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipTextSmall: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chipActiveColored: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  preferenceBox: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
  },
  preferenceSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    padding: 3,
    justifyContent: "center",
    marginLeft: "auto",
  },
  toggleOn: {
    backgroundColor: "#7C3AED",
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleCircleOn: {
    alignSelf: "flex-end",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 232, 240, 0.7)",
  },
  menuText: {
    marginLeft: 12,
    fontSize: 14.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  helpContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  helpQuestion: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#6D28D9",
    marginTop: 10,
    marginBottom: 2,
  },
  helpAnswer: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  crisisBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  crisisTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 6,
  },
  crisisPhone: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#7F1D1D",
    marginTop: 6,
  },
  crisisNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    textDecorationLine: "underline",
    marginTop: 2,
  },

  modalHandleBar: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },

  payModalCard: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  payBenefitsBox: {
    backgroundColor: "#F5F3FF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    gap: 4,
  },
  payBenefitsTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#5B21B6",
    marginBottom: 2,
  },
  payBenefitItem: {
    fontSize: 12.5,
    color: "#4C1D95",
    lineHeight: 18,
  },
  payMethodRow: {
    flexDirection: "row",
    gap: 8,
  },
  payMethodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  payMethodBtnActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  payMethodBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
    textAlign: "center",
  },
  payFormBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  payFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  payInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 45,
    fontSize: 13.5,
    color: "#1E293B",
  },
  payPaypalHint: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },

  photoModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  photoModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  photoModalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  photoOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  photoModalOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  photoModalCancel: {
    marginTop: 6,
    paddingVertical: 11,
    alignItems: "center",
  },
  photoModalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoModalCard: {
    width: "100%",
    maxHeight: "88%",
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
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoModalAvatarRing: {
    padding: 3.5,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    shadowColor: "#4F46E5",
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
    backgroundColor: "#EFF6FF",
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
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  infoModalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  infoModalSpec: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },
  ratingBadgeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingBadgeTopText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#92400E",
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
    alignItems: "flex-start",
    gap: 10,
  },
  detailIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDetailText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  locationDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 8,
  },
  locationLugarTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0C4A6E",
    marginBottom: 2,
  },
  locationFloorText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0369A1",
    marginTop: 3,
  },
  locationRefText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E0F2FE",
    paddingVertical: 8,
    borderRadius: 10,
  },
  openMapBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0369A1",
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

  dirModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  dirModalCard: {
    height: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  dirModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dirModalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
  },
  dirModalSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  dirModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dirSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  dirSearchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E293B",
  },
  dirCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  dirCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
  },
  dirPsiCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  dirPsiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dirPsiAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#BAE6FD",
  },
  dirPsiAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dirPsiName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  dirPsiSpec: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4F46E5",
    marginTop: 1,
  },
  dirPsiBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
    flexWrap: "wrap",
  },
  dirModBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dirModBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  dirStarBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dirStarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  dirAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dirAddressPlace: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F766E",
  },
  dirAddressLine: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  dirOnlineNote: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
  },
  dirPsiFooterRow: {
    flexDirection: "row",
    gap: 8,
  },
  dirRequestBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0D9488",
  },
  dirRequestBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyDirBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyDirTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
    textAlign: "center",
  },
  emptyDirDesc: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  agendarBox: {
    backgroundColor: "#F0FDFA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  backToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  backToListText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F766E",
  },
  agendarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  agendarHint: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  agendarLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  agendarModRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  agendarModBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  agendarModBtnActive: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  agendarModText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  agendarModTextActive: {
    color: "#FFFFFF",
  },

  miniCalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
    marginBottom: 14,
  },
  miniCalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  miniCalMonthTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  miniCalWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  miniCalWeekText: {
    width: 34,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  miniCalDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  miniCalCell: {
    width: "14.28%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCalDayBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCalDayBubbleSelected: {
    backgroundColor: "#0D9488",
  },
  miniCalDayText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1E293B",
  },

  timeWheelRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  timeWheelBox: {
    flex: 1.15,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
    overflow: "hidden",
  },
  timeWheelBoxSmall: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
    overflow: "hidden",
  },

  agendarInput: {
    minHeight: 84,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#99F6E4",
    padding: 12,
    fontSize: 13.5,
    textAlignVertical: "top",
    color: "#1E293B",
  },
  agendarSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  agendarSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  reviewModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
  },
  reviewIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reviewBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 1,
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  reviewSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  reviewInput: {
    width: "100%",
    minHeight: 80,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    fontSize: 13.5,
    textAlignVertical: "top",
    color: "#1E293B",
    marginBottom: 12,
  },
  anonToggleRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  anonOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  anonOptionBtnActive: {
    backgroundColor: "#0F766E",
  },
  anonOptionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  anonOptionTextActive: {
    color: "#FFFFFF",
  },

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
});