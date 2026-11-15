import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";

const PALETTE = {
  tealDeep: "#6192A4",
  tealMid: "#8BC1D1",
  lavenderSoft: "#CEC7FD",
  purpleVibrant: "#A374CC",
  indigoMuted: "#7E83C2",
  bgCanvas: "#F5F3FF",
  cardWhite: "#FFFFFF",
  textDark: "#1E1B4B",
  textMuted: "#64748B",
};

const PRIVACIDAD_DEFAULT = {
  fotoPerfil: true,
  cedulaProfesional: true,
  especialidad: true,
  telefono: false,
  correo: false,
  ubicacion: true,
  biografia: true,
};

export default function PerfilPsicologo({ navigation }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Modales personalizados
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [modalGuardadoVisible, setModalGuardadoVisible] = useState(false);

  // Datos profesionales registrados
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [nombre, setNombre] = useState("");
  const [cedulaProfesional, setCedulaProfesional] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [nombreConsultorio, setNombreConsultorio] = useState("");
  const [direccionConsultorio, setDireccionConsultorio] = useState("");
  const [ciudadConsultorio, setCiudadConsultorio] = useState("");
  const [pisoConsultorio, setPisoConsultorio] = useState("");
  const [biografia, setBiografia] = useState("");
  const [codigoVinculacion, setCodigoVinculacion] = useState("PSI-492");

  // Configuración de privacidad hacia el paciente
  const [privacidad, setPrivacidad] = useState(PRIVACIDAD_DEFAULT);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    const cargarPerfil = async () => {
      if (!uid) {
        setCargando(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "psicologos", uid));
        if (snap.exists()) {
          const data = snap.data();
          setFotoPerfil(data.fotoPerfil || null);
          setNombre(data.nombre || auth.currentUser?.displayName || "");
          setCedulaProfesional(
            data.cedulaProfesional || data.cedula || ""
          );
          setEspecialidad(data.especialidad || data.enfoque || "");
          setTelefono(data.telefono || "");
          setCorreo(data.correo || auth.currentUser?.email || "");
          setNombreConsultorio(data.ubicacion?.nombreLugar || "");
          setDireccionConsultorio(
            data.ubicacion?.direccion || data.direccionConsultorio || ""
          );
          setCiudadConsultorio(data.ubicacion?.ciudad || "");
          setPisoConsultorio(data.ubicacion?.pisoConsultorio || "");
          setBiografia(data.biografia || data.descripcion || "");
          setCodigoVinculacion(data.codigoVinculacion || "PSI-492");

          if (data.privacidad) {
            setPrivacidad({ ...PRIVACIDAD_DEFAULT, ...data.privacidad });
          }
        }
      } catch (e) {
        console.warn("Error cargando perfil del psicólogo:", e);
        Alert.alert("Error", "No se pudieron cargar tus datos profesionales.");
      } finally {
        setCargando(false);
      }
    };

    cargarPerfil();
  }, [uid]);

  const togglePrivacidad = (campo) => {
    setPrivacidad((prev) => ({
      ...prev,
      [campo]: !prev[campo],
    }));
  };

  const abrirCamara = async () => {
    setModalFotoVisible(false);
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el permiso de cámara para tomar una nueva foto."
        );
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const uriFinal = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setFotoPerfil(uriFinal);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
  };

  const abrirGaleria = async () => {
    setModalFotoVisible(false);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el permiso de galería para seleccionar una imagen."
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const uriFinal = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setFotoPerfil(uriFinal);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo abrir la galería.");
    }
  };

  const handleGuardarCambios = async () => {
    if (!nombre.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Tu nombre profesional no puede quedar vacío."
      );
      return;
    }

    if (!uid) return;

    setGuardando(true);
    try {
      const payload = {
        fotoPerfil: fotoPerfil || null,
        nombre: nombre.trim(),
        cedulaProfesional: cedulaProfesional.trim(),
        especialidad: especialidad.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        biografia: biografia.trim(),
        direccionConsultorio: direccionConsultorio.trim(),
        ubicacion: {
          nombreLugar: nombreConsultorio.trim() || "Consultorio privado",
          direccion: direccionConsultorio.trim(),
          ciudad: ciudadConsultorio.trim(),
          pisoConsultorio: pisoConsultorio.trim(),
        },
        privacidad,
        actualizadoEn: serverTimestamp(),
      };

      await updateDoc(doc(db, "psicologos", uid), payload);
      setModalGuardadoVisible(true);
    } catch (e) {
      console.error("Error guardando perfil:", e);
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const iniciales = (nombre || "PSI")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const camposVisiblesCount = Object.values(privacidad).filter(Boolean).length;

  if (cargando) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={PALETTE.purpleVibrant} />
        <Text style={styles.loadingText}>Cargando perfil profesional...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PALETTE.indigoMuted}
      />

      {/* ENCABEZADO DEGRADADO */}
      <LinearGradient
        colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant, PALETTE.tealDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerEyebrow}>ESPACIO PROFESIONAL</Text>
            <Text style={styles.headerTitle}>Mi Perfil Clínico</Text>
          </View>

          <View style={styles.codePill}>
            <Ionicons name="key-outline" size={12} color="#FFFFFF" />
            <Text style={styles.codePillText}>{codigoVinculacion}</Text>
          </View>
        </View>

        {/* AVATAR CON CÁMARA / GALERÍA */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setModalFotoVisible(true)}
            style={styles.avatarOuterHalo}
          >
            <View style={styles.avatarRing}>
              {fotoPerfil ? (
                <Image source={{ uri: fotoPerfil }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={[PALETTE.lavenderSoft, PALETTE.tealMid]}
                  style={styles.avatarFallbackGradient}
                >
                  <Text style={styles.avatarInitials}>{iniciales}</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.headerDoctorName}>
            {nombre || "Especialista Lami"}
          </Text>
          <Text style={styles.headerDoctorSpec}>
            {especialidad || "Psicología Clínica • Red Lami"}
          </Text>

          <TouchableOpacity
            onPress={() => setModalFotoVisible(true)}
            activeOpacity={0.85}
            style={styles.changePhotoChip}
          >
            <Ionicons name="image-outline" size={14} color="#FFFFFF" />
            <Text style={styles.changePhotoChipText}>
              Actualizar foto de perfil
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: PALETTE.bgCanvas }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* VISTA PREVIA DE LO QUE VERÁ EL PACIENTE */}
          <LinearGradient
            colors={["#FFFFFF", "#F3EFFE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewBadge}>
                <Ionicons
                  name="eye-outline"
                  size={13}
                  color={PALETTE.purpleVibrant}
                />
                <Text style={styles.previewBadgeText}>
                  VISTA PREVIA PARA PACIENTES
                </Text>
              </View>
              <Text style={styles.previewCounterText}>
                {camposVisiblesCount}/7 visibles
              </Text>
            </View>

            <View style={styles.previewInnerRow}>
              {privacidad.fotoPerfil && fotoPerfil ? (
                <Image
                  source={{ uri: fotoPerfil }}
                  style={styles.previewAvatar}
                />
              ) : (
                <View style={styles.previewAvatarFallback}>
                  <Ionicons
                    name="medkit"
                    size={20}
                    color={PALETTE.indigoMuted}
                  />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {nombre || "Tu nombre profesional"}
                </Text>
                <Text style={styles.previewSpec} numberOfLines={1}>
                  {privacidad.especialidad
                    ? especialidad || "Especialidad clínica"
                    : "Especialista verificado • Red Lami"}
                </Text>
                {privacidad.cedulaProfesional && cedulaProfesional ? (
                  <Text style={styles.previewMeta}>
                    Cédula Prof.: {cedulaProfesional}
                  </Text>
                ) : null}
              </View>
            </View>
          </LinearGradient>

          {/* SECCIÓN 1: DATOS PROFESIONALES REGISTRADOS */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <LinearGradient
                colors={[PALETTE.lavenderSoft, "#E0E7FF"]}
                style={styles.cardIconCircle}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={PALETTE.indigoMuted}
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Datos de Registro</Text>
                <Text style={styles.cardSub}>
                  Mantén actualizada tu información clínica
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={PALETTE.indigoMuted}
                />
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej. Dra. Dayanna Illescas"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cédula profesional</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={PALETTE.tealDeep}
                />
                <TextInput
                  style={styles.input}
                  value={cedulaProfesional}
                  onChangeText={setCedulaProfesional}
                  placeholder="Ej. 12345678"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Especialidad / Enfoque terapéutico
              </Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="medkit-outline"
                  size={18}
                  color={PALETTE.purpleVibrant}
                />
                <TextInput
                  style={styles.input}
                  value={especialidad}
                  onChangeText={setEspecialidad}
                  placeholder="Ej. Terapia Cognitivo-Conductual • Ansiedad"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Teléfono de contacto</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={PALETTE.tealDeep}
                />
                <TextInput
                  style={styles.input}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  placeholder="Ej. 229 123 4567"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={PALETTE.indigoMuted}
                />
                <TextInput
                  style={styles.input}
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="especialista@correo.com"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Nombre del consultorio / clínica
              </Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={PALETTE.tealDeep}
                />
                <TextInput
                  style={styles.input}
                  value={nombreConsultorio}
                  onChangeText={setNombreConsultorio}
                  placeholder="Ej. Centro Terapéutico Lami"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dirección del consultorio</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={PALETTE.purpleVibrant}
                />
                <TextInput
                  style={styles.input}
                  value={direccionConsultorio}
                  onChangeText={setDireccionConsultorio}
                  placeholder="Calle, número, colonia..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.twoColsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ciudad</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={ciudadConsultorio}
                    onChangeText={setCiudadConsultorio}
                    placeholder="Veracruz, Ver."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Piso / Interior</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={pisoConsultorio}
                    onChangeText={setPisoConsultorio}
                    placeholder="Ej. Piso 2, Cons. 4"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Presentación / Biografía breve
              </Text>
              <View
                style={[
                  styles.inputBox,
                  { alignItems: "flex-start", paddingVertical: 10 },
                ]}
              >
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={biografia}
                  onChangeText={setBiografia}
                  multiline
                  placeholder="Comparte tu experiencia y forma de acompañar a tus pacientes..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* SECCIÓN 2: CONTROL DE PRIVACIDAD PARA EL PACIENTE */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <LinearGradient
                colors={[PALETTE.tealMid, "#CCFBF1"]}
                style={styles.cardIconCircle}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={PALETTE.tealDeep}
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Privacidad con Pacientes</Text>
                <Text style={styles.cardSub}>
                  Activa qué datos verá el paciente al vincularse
                </Text>
              </View>
            </View>

            <View style={styles.privacyNoticeBox}>
              <Ionicons
                name="information-circle"
                size={17}
                color={PALETTE.indigoMuted}
              />
              <Text style={styles.privacyNoticeText}>
                Tu nombre y código ({codigoVinculacion}) siempre son visibles
                para identificarte. Solo los campos activados aparecerán en el
                perfil del paciente.
              </Text>
            </View>

            {[
              {
                key: "fotoPerfil",
                label: "Foto de perfil profesional",
                desc: "Mostrar tu fotografía en la tarjeta del paciente",
                icon: "image-outline",
              },
              {
                key: "cedulaProfesional",
                label: "Cédula profesional",
                desc: "Acreditación profesional visible al vincularse",
                icon: "ribbon-outline",
              },
              {
                key: "especialidad",
                label: "Especialidad / Enfoque",
                desc: "Área clínica que atiendes",
                icon: "medkit-outline",
              },
              {
                key: "ubicacion",
                label: "Dirección del consultorio",
                desc: "Ubicación física para consultas presenciales",
                icon: "location-outline",
              },
              {
                key: "biografia",
                label: "Presentación / Biografía",
                desc: "Tu mensaje de bienvenida para el paciente",
                icon: "document-text-outline",
              },
              {
                key: "telefono",
                label: "Teléfono personal / consultorio",
                desc: "Permitir que el paciente vea tu número",
                icon: "call-outline",
              },
              {
                key: "correo",
                label: "Correo electrónico",
                desc: "Mostrar tu correo profesional",
                icon: "mail-outline",
              },
            ].map((item, idx, arr) => {
              const activo = !!privacidad[item.key];
              const esUltimo = idx === arr.length - 1;
              return (
                <View
                  key={item.key}
                  style={[
                    styles.privacyRow,
                    esUltimo && { borderBottomWidth: 0, paddingBottom: 2 },
                  ]}
                >
                  <View style={styles.privacyRowLeft}>
                    <View
                      style={[
                        styles.privacyMiniIcon,
                        activo && { backgroundColor: "#EFE9FE" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={
                          activo ? PALETTE.purpleVibrant : PALETTE.textMuted
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.privacyTitleLine}>
                        <Text style={styles.privacyLabel}>{item.label}</Text>
                        <View
                          style={[
                            styles.statusTag,
                            activo
                              ? styles.statusTagVisible
                              : styles.statusTagHidden,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusTagText,
                              activo
                                ? styles.statusTagTextVisible
                                : styles.statusTagTextHidden,
                            ]}
                          >
                            {activo ? "Visible" : "Oculto"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.privacyDesc}>{item.desc}</Text>
                    </View>
                  </View>

                  <Switch
                    value={activo}
                    onValueChange={() => togglePrivacidad(item.key)}
                    trackColor={{
                      false: "#CBD5E1",
                      true: PALETTE.lavenderSoft,
                    }}
                    thumbColor={activo ? PALETTE.purpleVibrant : "#F8FAFC"}
                  />
                </View>
              );
            })}
          </View>

          {/* BOTÓN GUARDAR CAMBIOS */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleGuardarCambios}
            disabled={guardando}
          >
            <LinearGradient
              colors={[
                PALETTE.indigoMuted,
                PALETTE.purpleVibrant,
                PALETTE.tealDeep,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, guardando && { opacity: 0.7 }]}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    Guardar Perfil y Privacidad
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL ELEGIR CÁMARA O GALERÍA */}
      <Modal
        visible={modalFotoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFotoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalCard}>
            <LinearGradient
              colors={[PALETTE.lavenderSoft, PALETTE.tealMid]}
              style={styles.photoModalIconCircle}
            >
              <Ionicons name="camera" size={26} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.photoModalTitle}>Foto de Perfil Clínica</Text>
            <Text style={styles.photoModalSubtitle}>
              Elige cómo deseas actualizar tu fotografía profesional
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.photoOptionBtn}
              onPress={abrirCamara}
            >
              <View
                style={[
                  styles.photoOptionIconBox,
                  { backgroundColor: "#EFE9FE" },
                ]}
              >
                <Ionicons
                  name="camera-outline"
                  size={21}
                  color={PALETTE.purpleVibrant}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionTitle}>
                  Tomar foto con cámara
                </Text>
                <Text style={styles.photoOptionSub}>
                  Captura una fotografía al instante
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={PALETTE.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.photoOptionBtn}
              onPress={abrirGaleria}
            >
              <View
                style={[
                  styles.photoOptionIconBox,
                  { backgroundColor: "#E0F2F1" },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={21}
                  color={PALETTE.tealDeep}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoOptionTitle}>
                  Elegir de la galería
                </Text>
                <Text style={styles.photoOptionSub}>
                  Selecciona una imagen guardada en tu dispositivo
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={PALETTE.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.photoCancelBtn}
              onPress={() => setModalFotoVisible(false)}
            >
              <Text style={styles.photoCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE GUARDADO EXITOSO */}
      <Modal
        visible={modalGuardadoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalGuardadoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <LinearGradient
              colors={[PALETTE.tealDeep, PALETTE.purpleVibrant]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successIconCircle}
            >
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.successPill}>
              <Text style={styles.successPillText}>CAMBIOS APLICADOS</Text>
            </View>

            <Text style={styles.successTitle}>
              ¡Perfil guardado correctamente!
            </Text>

            <Text style={styles.successBody}>
              Tus datos profesionales y preferencias de privacidad se
              actualizaron con éxito. Tus pacientes vinculados verán únicamente
              la información que activaste.
            </Text>

            <View style={styles.successSummaryBox}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={PALETTE.tealDeep}
              />
              <Text style={styles.successSummaryText}>
                {camposVisiblesCount} de 7 campos configurados como visibles
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setModalGuardadoVisible(false)}
              style={{ width: "100%" }}
            >
              <LinearGradient
                colors={[PALETTE.indigoMuted, PALETTE.purpleVibrant]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.successDoneBtn}
              >
                <Text style={styles.successDoneBtnText}>Entendido</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.indigoMuted,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PALETTE.bgCanvas,
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    shadowColor: PALETTE.indigoMuted,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 16,
  },
  avatarOuterHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarFallbackGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.tealDeep,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  headerDoctorName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 10,
  },
  headerDoctorSpec: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
    marginTop: 2,
  },
  changePhotoChip: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  changePhotoChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 44,
    gap: 16,
  },
  previewCard: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.lavenderSoft,
    shadowColor: PALETTE.purpleVibrant,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 10,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFE9FE",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  previewBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
    letterSpacing: 0.5,
  },
  previewCounterText: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.tealDeep,
  },
  previewInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: PALETTE.tealMid,
  },
  previewAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  previewSpec: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  previewMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.indigoMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: PALETTE.cardWhite,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EBE7FE",
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 2,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.indigoMuted,
    marginLeft: 2,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#E2E0F5",
    backgroundColor: "#FAF9FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: PALETTE.textDark,
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
    paddingVertical: 0,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#F1EFFC",
    marginVertical: 2,
  },
  twoColsRow: {
    flexDirection: "row",
    gap: 10,
  },
  privacyNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F4F2FF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.lavenderSoft,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: PALETTE.textDark,
    lineHeight: 16,
    fontWeight: "600",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F1FC",
    gap: 10,
  },
  privacyRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  privacyMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  privacyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  statusTagVisible: {
    backgroundColor: "#E0F2F1",
  },
  statusTagHidden: {
    backgroundColor: "#F1F5F9",
  },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  statusTagTextVisible: {
    color: PALETTE.tealDeep,
  },
  statusTagTextHidden: {
    color: PALETTE.textMuted,
  },
  privacyDesc: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: PALETTE.purpleVibrant,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  photoModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  photoModalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  photoModalSubtitle: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  photoOptionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF9FF",
    borderWidth: 1,
    borderColor: "#E8E4FA",
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
  },
  photoOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  photoOptionSub: {
    fontSize: 11.5,
    color: PALETTE.textMuted,
  },
  photoCancelBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  photoCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },

  // MODAL DE GUARDADO EXITOSO
  successModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PALETTE.lavenderSoft,
    shadowColor: PALETTE.purpleVibrant,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: PALETTE.tealDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  successPill: {
    backgroundColor: "#EFE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  successPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
    letterSpacing: 0.8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PALETTE.textDark,
    textAlign: "center",
  },
  successBody: {
    fontSize: 13,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
  },
  successSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 18,
  },
  successSummaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.tealDeep,
  },
  successDoneBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  successDoneBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});