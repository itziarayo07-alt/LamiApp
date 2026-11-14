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

  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [aceptandoCitaId, setAceptandoCitaId] = useState(null);
  const [solicitudReprogramando, setSolicitudReprogramando] = useState(null);
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
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(d.getDate()).padStart(2, "0")}`;
        })();

      const horaCita = solicitud.horaCita || "10:00 AM";
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
    if (!mensajeReprogramacion.trim()) {
      Alert.alert(
        "Escribe tu disponibilidad",
        "Indica qué horario te queda mejor para que el especialista pueda revisarlo."
      );
      return;
    }

    try {
      setEnviandoReprogramacion(true);
      const historialPrevio = Array.isArray(
        solicitudReprogramando.historialMensajes
      )
        ? solicitudReprogramando.historialMensajes
        : [];

      await updateDoc(
        doc(db, "solicitudes_sesion", solicitudReprogramando.id),
        {
          estado: "reprogramacion_solicitada",
          mensaje: mensajeReprogramacion.trim(),
          historialMensajes: [
            ...historialPrevio,
            {
              autor: "paciente",
              texto: mensajeReprogramacion.trim(),
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
        "Le enviamos tu mensaje al especialista para que confirme si tiene disponibilidad."
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

      await addDoc(collection(db, "solicitudes_sesion"), {
        pacienteId: user.uid,
        pacienteNombre: name.trim() || "Paciente Lami",
        pacienteCorreo: email.trim() || user.email || "",
        pacienteTelefono: phone.trim() || "",
        psicologoId: psi.id,
        psicologoNombre: psi.nombre || "Especialista",
        modalidadSolicitada,
        mensaje:
          mensajeSolicitud.trim() ||
          "Hola, me gustaría solicitar una primera sesión contigo.",
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
        `Le avisamos a ${psi.nombre} que deseas una sesión. Podrás ver su respuesta aquí mismo en tu perfil.`
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

  // Privacidad configurada por el psicólogo vinculado
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3e8ff" }}>
      <LinearGradient colors={["#faf5ff", "#f3e8ff"]} style={{ flex: 1 }}>
        <View style={styles.screen}>
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
                  <Ionicons name="sparkles-outline" size={16} color="#4F46E5" />
                  <Text style={styles.badgeText}>Tu espacio seguro 💜</Text>
                </LinearGradient>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setModalFotoUsuario(true)}
                style={styles.avatarCircle}
              >
                {fotoPerfil ? (
                  <Image
                    source={{ uri: fotoPerfil }}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <FontAwesome name="user" size={44} color="#6B7280" />
                )}
                <View style={styles.userCameraBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </LinearGradient>

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

            <TouchableOpacity onPress={addSession} style={styles.sessionButton}>
              <Text style={styles.sessionButtonText}>Hice una sesión 🎧</Text>
            </TouchableOpacity>

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
                    colors={["#F8FAFC", "#EFF6FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.especialistaCard}
                  >
                    <View style={styles.avatarRing}>
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
                    </View>

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
                            name="location-outline"
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
                      <Ionicons name="star-outline" size={15} color="#B45309" />
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
                  <Text style={[styles.sectionSubtitle, { marginTop: 6 }]}>
                    Ingresa el código que te dio tu psicólogo en consulta (ej.
                    PSI-492), escanea su QR o busca especialistas cercanos.
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
                        color="#4F46E5"
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
                      styles.primaryIndigoBtn,
                      { marginTop: 12, marginBottom: 8 },
                    ]}
                  >
                    <Text style={styles.sessionButtonText}>
                      {vinculando
                        ? "Vinculando..."
                        : "Vincular con mi psicólogo"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.secondaryLinkBtnsRow}>
                    <TouchableOpacity
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

            {misSolicitudes.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Mis solicitudes y citas 📅
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Revisa aquí cuando tu especialista responda o propón otro
                  horario.
                </Text>

                <View style={{ gap: 10 }}>
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
                            Solicitud enviada ({sol.modalidadSolicitada}). En
                            cuanto el especialista responda, verás su mensaje
                            aquí.
                          </Text>
                        )}

                        {esperandoCambio && sol.mensaje ? (
                          <Text style={styles.solicitudEsperaText}>
                            Tu mensaje: "{sol.mensaje}"
                          </Text>
                        ) : null}

                        {(confirmadaPorTerapeuta || yaAceptada) &&
                          (sol.fechaCita || sol.horaCita) && (
                            <Text style={styles.solicitudHorarioText}>
                              🗓️ Propuesta: {sol.fechaCita || "Próxima fecha"}{" "}
                              {sol.horaCita ? `• ${sol.horaCita}` : ""}
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
                                  Propón un nuevo horario o explica tu
                                  disponibilidad:
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
                                        : "Enviar mensaje"}
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

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                  Datos personales 👤
                </Text>
                <TouchableOpacity onPress={() => setModalFotoUsuario(true)}>
                  <Text style={styles.changePhotoLink}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.labelInline}>Nombre</Text>
                <MaterialIcons name="edit" size={16} color="#7C3AED" />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                />
              </View>

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
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                />
              </View>

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
                  placeholder="Tu número celular"
                />
              </View>

              <Text style={styles.labelInline}>Idioma 🌐</Text>
              <View style={styles.dropdown}>
                <Picker selectedValue={language} onValueChange={setLanguage}>
                  <Picker.Item label="Español" value="es" />
                  <Picker.Item label="Inglés" value="en" />
                </Picker>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={guardandoPerfil}
                onPress={handleGuardarDatosPersonales}
                style={[
                  styles.saveProfileBtn,
                  guardandoPerfil && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveProfileBtnText}>
                  {guardandoPerfil
                    ? "Guardando cambios..."
                    : "Guardar datos personales"}
                </Text>
              </TouchableOpacity>
            </View>

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

            <LinearGradient
              colors={["#eef2ff", "#fef9c3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardColored}
            >
              <Text style={styles.sectionTitle}>Más opciones ⚙️</Text>

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

      <Modal
        visible={modalDirectorio}
        transparent
        animationType="slide"
        onRequestClose={() => setModalDirectorio(false)}
      >
        <View style={styles.dirModalOverlay}>
          <View style={styles.dirModalCard}>
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
                    Tu solicitud llegará al especialista. Cuando revise su
                    disponibilidad y acepte agendarla, recibirás su respuesta y
                    ubicación exacta en tu perfil.
                  </Text>

                  <Text style={styles.agendarLabel}>Modalidad preferida</Text>
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

                  <Text style={styles.agendarLabel}>
                    Mensaje o disponibilidad horaria
                  </Text>
                  <TextInput
                    style={styles.agendarInput}
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
                          : "Enviar solicitud"}
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
    marginBottom: 2,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },

  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    position: "relative",
    borderWidth: 2,
    borderColor: "#DDD6FE",
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  photoModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
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
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  photoOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  photoModalOptionText: {
    fontSize: 15,
    fontWeight: "600",
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
  primaryIndigoBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
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
    borderColor: "#DBEAFE",
  },
  avatarRing: {
    padding: 2.5,
    borderRadius: 32,
    backgroundColor: "#BFDBFE",
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
    paddingVertical: 10,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
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

  secondaryLinkBtnsRow: {
    flexDirection: "row",
    gap: 8,
  },
  qrScanInlineBtn: {
    padding: 6,
  },
  qrScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 16,
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
    paddingVertical: 11,
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
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
    paddingVertical: 3,
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
    paddingVertical: 10,
    borderRadius: 12,
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
    paddingVertical: 10,
    borderRadius: 12,
  },
  otroHorarioBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  reprogramBox: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 12,
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
    borderRadius: 10,
    padding: 8,
    fontSize: 12.5,
    minHeight: 60,
    textAlignVertical: "top",
    color: "#1E293B",
  },
  reprogramCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
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
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  reprogramSendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255,255,255,0.75)",
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
    height: "86%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    fontSize: 14.5,
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
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
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
  changePhotoLink: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#7C3AED",
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
  saveProfileBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveProfileBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
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