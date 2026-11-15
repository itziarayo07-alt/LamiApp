import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";

function generarCodigoEspecialista() {
  const num = Math.floor(100 + Math.random() * 900);
  return `PSI-${num}`;
}

const PLANES_TERAPEUTA = [
  {
    id: "semilla",
    nombre: "Semilla",
    precio: 299,
    limite: 10,
    descripcion: "Ideal para iniciar • Hasta 10 pacientes vinculados",
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precio: 599,
    limite: 30,
    descripcion: "Consultorio activo • Hasta 30 pacientes vinculados",
    destacado: true,
  },
  {
    id: "consultorio",
    nombre: "Consultorio",
    precio: 1299,
    limite: 100,
    descripcion: "Clínica o grupo • Hasta 100 pacientes vinculados",
  },
];

export default function RegistroPsicologo({ navigation }) {
  const [fotoBase64, setFotoBase64] = useState(null);
  const [modalFotoVisible, setModalFotoVisible] = useState(false);

  const [modalExitoVisible, setModalExitoVisible] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState("");

  const [avisoModal, setAvisoModal] = useState({
    visible: false,
    etiqueta: "",
    titulo: "",
    mensaje: "",
  });

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [genero, setGenero] = useState("");
  const [cedulaProfesional, setCedulaProfesional] = useState("");
  const [especialidad, setEspecialidad] = useState("Ansiedad y Estrés");
  const [modalidad, setModalidad] = useState("presencial");
  const [planSeleccionado, setPlanSeleccionado] = useState("profesional");

  // Estados de método de pago
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] =
    useState("tarjeta");
  const [titularTarjeta, setTitularTarjeta] = useState("");
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [expiracionTarjeta, setExpiracionTarjeta] = useState("");
  const [cvvTarjeta, setCvvTarjeta] = useState("");
  const [correoPaypal, setCorreoPaypal] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  const [tipoLugar, setTipoLugar] = useState("consultorio_privado");
  const [nombreLugar, setNombreLugar] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [pisoConsultorio, setPisoConsultorio] = useState("");
  const [referencia, setReferencia] = useState("");

  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmPassword, setVerConfirmPassword] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const mostrarAviso = (etiqueta, titulo, mensaje) => {
    setAvisoModal({
      visible: true,
      etiqueta,
      titulo,
      mensaje,
    });
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

  const abrirGaleria = async () => {
    setModalFotoVisible(false);
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      mostrarAviso(
        "PERMISOS",
        "Acceso a galería requerido",
        "Habilita el permiso de galería en tu dispositivo para seleccionar una fotografía."
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
      setFotoBase64(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  };

  const abrirCamara = async () => {
    setModalFotoVisible(false);
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      mostrarAviso(
        "PERMISOS",
        "Acceso a cámara requerido",
        "Habilita el permiso de cámara en tu dispositivo para tomar tu fotografía."
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
      setFotoBase64(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  };

  const handleRegistro = async () => {
    if (
      !nombre.trim() ||
      !apellidos.trim() ||
      !genero ||
      !cedulaProfesional.trim() ||
      !correo.trim() ||
      !password ||
      !confirmarPassword
    ) {
      mostrarAviso(
        "VERIFICACIÓN",
        "Campos incompletos",
        "Por favor completa todos los campos obligatorios antes de continuar con el alta."
      );
      return;
    }

    const requiereDireccion =
      modalidad === "presencial" || modalidad === "hybrid";

    if (requiereDireccion) {
      if (!ciudad.trim() || !direccion.trim()) {
        mostrarAviso(
          "UBICACIÓN DE CONSULTA",
          "Falta la dirección del consultorio",
          "Como atiendes de forma presencial o híbrida, indica al menos la ciudad y la dirección donde recibes a tus pacientes."
        );
        return;
      }

      if (tipoLugar === "hospital_clinica" && !nombreLugar.trim()) {
        mostrarAviso(
          "CLÍNICA U HOSPITAL",
          "Nombre del centro médico requerido",
          "Indica el nombre del hospital, clínica o torre médica donde se encuentra tu consultorio."
        );
        return;
      }
    }

    if (password !== confirmarPassword) {
      mostrarAviso(
        "CREDENCIALES",
        "Las contraseñas no coinciden",
        "Verifica que ambos campos de contraseña sean idénticos."
      );
      return;
    }

    if (password.length < 6) {
      mostrarAviso(
        "CREDENCIALES",
        "Contraseña muy corta",
        "La contraseña debe contener al menos 6 caracteres."
      );
      return;
    }

    if (cedulaProfesional.trim().length < 6) {
      mostrarAviso(
        "ACREDITACIÓN",
        "Cédula profesional inválida",
        "Ingresa un número de cédula profesional válido de al menos 6 dígitos."
      );
      return;
    }

    if (!planSeleccionado) {
      mostrarAviso(
        "SUSCRIPCIÓN",
        "Selecciona tu plan",
        "Elige el plan profesional con el que deseas iniciar en Lami."
      );
      return;
    }

    // Validación de método de pago para terapeutas
    let resumenMetodo = "";
    if (metodoPagoSeleccionado === "tarjeta") {
      const digitos = numeroTarjeta.replace(/\s/g, "");
      if (!titularTarjeta.trim()) {
        mostrarAviso(
          "MÉTODO DE PAGO",
          "Titular requerido",
          "Ingresa el nombre del titular de la tarjeta."
        );
        return;
      }
      if (digitos.length < 16) {
        mostrarAviso(
          "MÉTODO DE PAGO",
          "Tarjeta incompleta",
          "Ingresa los 16 dígitos de tu tarjeta."
        );
        return;
      }
      if (expiracionTarjeta.length < 5) {
        mostrarAviso(
          "MÉTODO DE PAGO",
          "Vencimiento requerido",
          "Ingresa la fecha de vencimiento (MM/AA)."
        );
        return;
      }
      if (cvvTarjeta.length < 3) {
        mostrarAviso(
          "MÉTODO DE PAGO",
          "CVV requerido",
          "Ingresa el código CVV de seguridad."
        );
        return;
      }
      resumenMetodo = `Tarjeta terminación •••• ${digitos.slice(-4)}`;
    } else {
      if (!correoPaypal.trim() || !correoPaypal.includes("@")) {
        mostrarAviso(
          "MÉTODO DE PAGO",
          "PayPal inválido",
          "Ingresa un correo electrónico válido de PayPal."
        );
        return;
      }
      resumenMetodo = `PayPal (${correoPaypal.trim()})`;
    }

    if (!aceptaTerminos) {
      mostrarAviso(
        "DECLARACIÓN",
        "Validación profesional requerida",
        "Confirma que cuentas con título y cédula profesional vigente para ejercer atención psicológica."
      );
      return;
    }

    try {
      setCargando(true);
      setProcesandoPago(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setProcesandoPago(false);

      const cred = await createUserWithEmailAndPassword(
        auth,
        correo.trim(),
        password
      );
      const uid = cred.user.uid;
      const codigoVinculacion = generarCodigoEspecialista();
      const planInfo =
        PLANES_TERAPEUTA.find((p) => p.id === planSeleccionado) ||
        PLANES_TERAPEUTA[1];

      const ubicacionData = requiereDireccion
        ? {
            tipoLugar,
            nombreLugar:
              tipoLugar === "hospital_clinica"
                ? nombreLugar.trim()
                : nombreLugar.trim() || "Consultorio privado independiente",
            ciudad: ciudad.trim(),
            ciudadKey: ciudad
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            direccion: direccion.trim(),
            pisoConsultorio: pisoConsultorio.trim(),
            referencia: referencia.trim(),
          }
        : null;

      await setDoc(doc(db, "psicologos", uid), {
        nombre: `${nombre.trim()} ${apellidos.trim()}`,
        nombres: nombre.trim(),
        apellidos: apellidos.trim(),
        genero,
        cedulaProfesional: cedulaProfesional.trim(),
        estadoValidacion: "en_revision",
        especialidad,
        modalidad,
        ubicacion: ubicacionData,
        calificacionPromedio: 5.0,
        totalResenas: 0,
        correo: correo.trim(),
        telefono: telefono.trim(),
        fotoPerfil: fotoBase64 || null,
        codigoVinculacion,
        plan: planInfo.id,
        planNombre: planInfo.nombre,
        precioMensual: planInfo.precio,
        limitePacientes: planInfo.limite,
        bonificacionPorPaciente: 50,
        estadoSuscripcion: "activo",
        metodoPagoTipo: metodoPagoSeleccionado,
        metodoPagoResumen: resumenMetodo,
        suscripcionActualizadaEn: serverTimestamp(),
        creadoEn: serverTimestamp(),
      });

      setCodigoGenerado(codigoVinculacion);
      setModalExitoVisible(true);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        mostrarAviso(
          "CUENTA EXISTENTE",
          "Correo ya registrado",
          "Este correo electrónico ya cuenta con un perfil activo en Lami."
        );
      } else if (error.code === "auth/invalid-email") {
        mostrarAviso(
          "CORREO INVÁLIDO",
          "Formato incorrecto",
          "Ingresa una dirección de correo electrónico válida."
        );
      } else {
        mostrarAviso("ERROR DE REGISTRO", "No se pudo completar", error.message);
      }
    } finally {
      setProcesandoPago(false);
      setCargando(false);
    }
  };

  const textoBotonRegistro = () => {
    if (procesandoPago) return "Procesando pago...";
    if (cargando) return "Creando perfil...";
    return "Completar registro";
  };

  const esPresencialOHibrido =
    modalidad === "presencial" || modalidad === "hybrid";

  return (
    <LinearGradient
      colors={["#6192A4", "#8BC1D1", "#CEC7FD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>LAMI PROFESIONAL</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingBottom:
                  Platform.OS === "android" && keyboardHeight > 0
                    ? keyboardHeight + 24
                    : 40,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.heroTitle}>Alta de Especialista</Text>
            <Text style={styles.heroSubtitle}>
              Configura tu perfil clínico para vincular y acompañar a tus
              pacientes
            </Text>

            <View style={styles.mainCard}>
              <View style={styles.photoSection}>
                <TouchableOpacity
                  onPress={() => setModalFotoVisible(true)}
                  activeOpacity={0.85}
                  style={styles.avatarRing}
                >
                  {fotoBase64 ? (
                    <Image
                      source={{ uri: fotoBase64 }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarEmpty}>
                      <Ionicons
                        name="person-outline"
                        size={40}
                        color="#6192A4"
                      />
                    </View>
                  )}
                  <View style={styles.cameraPill}>
                    <Ionicons name="camera" size={15} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalFotoVisible(true)}>
                  <Text style={styles.photoActionText}>
                    {fotoBase64
                      ? "Cambiar fotografía de perfil"
                      : "Agregar fotografía de perfil"}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.photoSubtext}>
                  Esta imagen será visible para tus pacientes vinculados
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeader}>Identidad profesional</Text>

              <Text style={styles.label}>Nombre(s)</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  placeholderTextColor="#94A3B8"
                  value={nombre}
                  onChangeText={setNombre}
                />
              </View>

              <Text style={styles.label}>Apellidos</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Apellidos"
                  placeholderTextColor="#94A3B8"
                  value={apellidos}
                  onChangeText={setApellidos}
                />
              </View>

              <Text style={styles.label}>Sexo</Text>
              <View style={styles.pickerBox}>
                <Picker selectedValue={genero} onValueChange={setGenero}>
                  <Picker.Item label="Seleccionar" value="" />
                  <Picker.Item label="Femenino" value="Femenino" />
                  <Picker.Item label="Masculino" value="Masculino" />
                </Picker>
              </View>

              <Text style={styles.label}>Teléfono de contacto</Text>
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="phone-android"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Número celular"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeader}>Acreditación y consulta</Text>

              <Text style={styles.label}>Cédula profesional</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#7E83C2"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Número de cédula"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  value={cedulaProfesional}
                  onChangeText={setCedulaProfesional}
                />
              </View>

              <Text style={styles.label}>Especialidad principal</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={especialidad}
                  onValueChange={setEspecialidad}
                >
                  <Picker.Item
                    label="Ansiedad y Estrés"
                    value="Ansiedad y Estrés"
                  />
                  <Picker.Item
                    label="Terapia Cognitivo-Conductual"
                    value="TCC"
                  />
                  <Picker.Item
                    label="Depresión y Estado de Ánimo"
                    value="Depresión"
                  />
                  <Picker.Item label="Duelo y Tanatología" value="Duelo" />
                  <Picker.Item
                    label="Burnout y Salud Laboral"
                    value="Burnout"
                  />
                </Picker>
              </View>

              <Text style={styles.label}>Modalidad de atención</Text>
              <View style={styles.pickerBox}>
                <Picker selectedValue={modalidad} onValueChange={setModalidad}>
                  <Picker.Item label="100% Presencial" value="presencial" />
                  <Picker.Item
                    label="Híbrida (Presencial y Online)"
                    value="hybrid"
                  />
                  <Picker.Item label="100% Online" value="online" />
                </Picker>
              </View>

              {esPresencialOHibrido && (
                <View style={styles.locationCard}>
                  <View style={styles.locationHeaderRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#7E83C2"
                    />
                    <Text style={styles.locationHeaderTitle}>
                      Ubicación de consulta presencial
                    </Text>
                  </View>

                  <Text style={styles.locationHint}>
                    Ayuda a pacientes cercanos en tu ciudad a encontrarte y
                    llegar fácilmente.
                  </Text>

                  <View style={styles.tipoLugarRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setTipoLugar("consultorio_privado")}
                      style={[
                        styles.tipoLugarBtn,
                        tipoLugar === "consultorio_privado" &&
                          styles.tipoLugarBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="home-outline"
                        size={15}
                        color={
                          tipoLugar === "consultorio_privado"
                            ? "#FFFFFF"
                            : "#475569"
                        }
                      />
                      <Text
                        style={[
                          styles.tipoLugarText,
                          tipoLugar === "consultorio_privado" &&
                            styles.tipoLugarTextActive,
                        ]}
                      >
                        Consultorio privado
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setTipoLugar("hospital_clinica")}
                      style={[
                        styles.tipoLugarBtn,
                        tipoLugar === "hospital_clinica" &&
                          styles.tipoLugarBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={15}
                        color={
                          tipoLugar === "hospital_clinica"
                            ? "#FFFFFF"
                            : "#475569"
                        }
                      />
                      <Text
                        style={[
                          styles.tipoLugarText,
                          tipoLugar === "hospital_clinica" &&
                            styles.tipoLugarTextActive,
                        ]}
                      >
                        Hospital / Clínica
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {tipoLugar === "hospital_clinica" && (
                    <>
                      <Text style={styles.label}>
                        Nombre del hospital, clínica o torre médica *
                      </Text>
                      <View style={styles.inputBoxWhite}>
                        <Ionicons
                          name="medkit-outline"
                          size={18}
                          color="#6192A4"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Ej. Hospital.."
                          placeholderTextColor="#94A3B8"
                          value={nombreLugar}
                          onChangeText={setNombreLugar}
                        />
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Ciudad o municipio *</Text>
                  <View style={styles.inputBoxWhite}>
                    <Ionicons
                      name="map-outline"
                      size={18}
                      color="#6192A4"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Ingresa la ciudad."
                      placeholderTextColor="#94A3B8"
                      value={ciudad}
                      onChangeText={setCiudad}
                    />
                  </View>

                  <Text style={styles.label}>
                    Dirección (calle, número y colonia) *
                  </Text>
                  <View style={styles.inputBoxWhite}>
                    <Ionicons
                      name="navigate-outline"
                      size={18}
                      color="#6192A4"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Av. 16 de Septiembre #955, Col. Centro"
                      placeholderTextColor="#94A3B8"
                      value={direccion}
                      onChangeText={setDireccion}
                    />
                  </View>

                  <Text style={styles.label}>
                    {tipoLugar === "hospital_clinica"
                      ? "Piso y número de consultorio"
                      : "Interior, piso o despacho (opcional)"}
                  </Text>
                  <View style={styles.inputBoxWhite}>
                    <Ionicons
                      name="layers-outline"
                      size={18}
                      color="#6192A4"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={
                        tipoLugar === "hospital_clinica"
                          ? "Ej. Piso 3, Consultorio #"
                          : "Ej. Planta alta, Despacho B"
                      }
                      placeholderTextColor="#94A3B8"
                      value={pisoConsultorio}
                      onChangeText={setPisoConsultorio}
                    />
                  </View>

                  <Text style={styles.label}>
                    Referencia para llegar (opcional)
                  </Text>
                  <View style={[styles.inputBoxWhite, { marginBottom: 2 }]}>
                    <Ionicons
                      name="compass-outline"
                      size={18}
                      color="#6192A4"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Frente al parque, fachada blanca"
                      placeholderTextColor="#94A3B8"
                      value={referencia}
                      onChangeText={setReferencia}
                    />
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionHeader}>
                Selecciona tu plan profesional
              </Text>
              <Text style={styles.planIntroText}>
                Con el Sistema Flywheel recibes $50 MXN de descuento por cada
                paciente activo al mes hasta llegar a $0 MXN.
              </Text>

              <View style={styles.plansList}>
                {PLANES_TERAPEUTA.map((plan) => {
                  const activo = planSeleccionado === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      activeOpacity={0.88}
                      onPress={() => setPlanSeleccionado(plan.id)}
                      style={[
                        styles.planCard,
                        activo && styles.planCardActive,
                      ]}
                    >
                      <View style={styles.planTopRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons
                            name={
                              activo ? "radio-button-on" : "radio-button-off"
                            }
                            size={20}
                            color={activo ? "#7E83C2" : "#94A3B8"}
                          />
                          <Text style={styles.planTitle}>{plan.nombre}</Text>
                          {plan.destacado && (
                            <View style={styles.planPopularBadge}>
                              <Text style={styles.planPopularText}>
                                RECOMENDADO
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.planPrice}>
                          ${plan.precio.toLocaleString("es-MX")}{" "}
                          <Text style={styles.planPeriod}>MXN/mes</Text>
                        </Text>
                      </View>
                      <Text style={styles.planDesc}>{plan.descripcion}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sección de método de pago integrada */}
              <View style={styles.paymentSectionContainer}>
                <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
                   Método de pago de suscripción
                </Text>
                <View style={styles.payMethodRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
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
                          : "#1E293B"
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
                    activeOpacity={0.85}
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
                          : "#1E293B"
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
                      Se vinculará tu cuenta de PayPal para la suscripción
                      mensual del plan seleccionado.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeader}>Credenciales de acceso</Text>

              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="email"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={correo}
                  onChangeText={setCorreo}
                />
              </View>

              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="lock"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!verPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setVerPassword(!verPassword)}>
                  <Ionicons
                    name={verPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#6192A4"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="lock-outline"
                  size={18}
                  color="#6192A4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!verConfirmPassword}
                  value={confirmarPassword}
                  onChangeText={setConfirmarPassword}
                />
                <TouchableOpacity
                  onPress={() => setVerConfirmPassword(!verConfirmPassword)}
                >
                  <Ionicons
                    name={verConfirmPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#6192A4"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setAceptaTerminos(!aceptaTerminos)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    aceptaTerminos && styles.checkboxChecked,
                  ]}
                >
                  {aceptaTerminos && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkText}>
                  Confirmo que cuento con título y cédula profesional vigente
                  para ejercer atención psicológica.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRegistro}
                disabled={cargando || procesandoPago}
                activeOpacity={0.9}
                style={{ marginTop: 14 }}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2", "#A374CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>
                    {textoBotonRegistro()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={modalFotoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalFotoVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Fotografía de perfil</Text>
              <Text style={styles.modalSubtitle}>
                Selecciona cómo deseas agregar tu imagen profesional
              </Text>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={abrirCamara}
              >
                <View style={styles.modalIconBox}>
                  <Ionicons name="camera-outline" size={22} color="#6192A4" />
                </View>
                <Text style={styles.modalOptionText}>Tomar fotografía</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={abrirGaleria}
              >
                <View style={styles.modalIconBox}>
                  <Ionicons name="images-outline" size={22} color="#7E83C2" />
                </View>
                <Text style={styles.modalOptionText}>Elegir de la galería</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalFotoVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={avisoModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setAvisoModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.alertCard}>
              <View style={styles.alertIconCircle}>
                <Ionicons
                  name="alert-circle-outline"
                  size={34}
                  color="#7E83C2"
                />
              </View>

              <Text style={styles.alertBadge}>{avisoModal.etiqueta}</Text>
              <Text style={styles.alertTitle}>{avisoModal.titulo}</Text>
              <Text style={styles.alertDesc}>{avisoModal.mensaje}</Text>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 6 }}
                onPress={() =>
                  setAvisoModal((prev) => ({ ...prev, visible: false }))
                }
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2", "#A374CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={modalExitoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successCard}>
              <LinearGradient
                colors={["#6192A4", "#7E83C2"]}
                style={styles.successIconCircle}
              >
                <Ionicons name="checkmark" size={34} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.successBadge}>PERFIL CREADO</Text>
              <Text style={styles.successTitle}>Registro profesional listo</Text>
              <Text style={styles.successDesc}>
                Tu cuenta ha sido creada correctamente, tu suscripción está activa
                y tu cédula quedó registrada para validación.
              </Text>

              <View style={styles.codeCard}>
                <Text style={styles.codeCardLabel}>
                  CÓDIGO DE VINCULACIÓN PARA PACIENTES
                </Text>
                <Text style={styles.codeCardValue}>{codigoGenerado}</Text>
                <Text style={styles.codeCardHint}>
                  Compártelo en consulta para conectar con tus pacientes
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 8 }}
                onPress={() => {
                  setModalExitoVisible(false);
                  navigation.replace("Login");
                }}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2", "#A374CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>Ir a iniciar sesión</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#F8FAFC",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#1E293B",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: "#8BC1D1",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  avatarEmpty: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraPill: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#A374CC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7E83C2",
    marginTop: 10,
  },
  photoSubtext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputBoxWhite: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1E293B",
  },
  pickerBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  locationCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginTop: 4,
    marginBottom: 6,
  },
  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  locationHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    marginBottom: 12,
  },
  tipoLugarRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tipoLugarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  tipoLugarBtnActive: {
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
  },
  tipoLugarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tipoLugarTextActive: {
    color: "#FFFFFF",
  },
  planIntroText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 10,
  },
  plansList: {
    gap: 10,
  },
  planCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  planCardActive: {
    backgroundColor: "#F5F3FF",
    borderColor: "#7E83C2",
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  planPopularBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  planPopularText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6D28D9",
  },
  planPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#6192A4",
  },
  planPeriod: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  planDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 5,
    marginLeft: 28,
  },
  paymentSectionContainer: {
    marginTop: 6,
    gap: 8,
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  payMethodBtnActive: {
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
  },
  payMethodBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  payFormBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    marginTop: 6,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    color: "#1E293B",
  },
  payPaypalHint: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#7E83C2",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#A374CC",
    borderColor: "#A374CC",
  },
  checkText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  submitBtn: {
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalCancel: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  alertCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#1E293B",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#CEC7FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  alertBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  alertDesc: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  successCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#1E293B",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  successIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  successBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  successDesc: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  codeCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#B3D3DA",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  codeCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 0.8,
  },
  codeCardValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#7E83C2",
    letterSpacing: 3,
    marginVertical: 4,
  },
  codeCardHint: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
});