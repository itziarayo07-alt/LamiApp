import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
import { auth, db } from "../config/firebaseConfig";

export default function Registro({ navigation }) {
  const [paso, setPaso] = useState(1);

  const [nombre, setNombre] = useState("");
  const [genero, setGenero] = useState("");
  const [pais, setPais] = useState("Mexico");
  const [telefono, setTelefono] = useState("");

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);

  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmPassword, setVerConfirmPassword] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});

  const [avisoModal, setAvisoModal] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    irALogin: false,
  });

  const [modalExitoVisible, setModalExitoVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const mostrarAviso = (titulo, mensaje, irALogin = false) => {
    setAvisoModal({
      visible: true,
      titulo,
      mensaje,
      irALogin,
    });
  };

  const avanzarPaso2 = () => {
    const err = {};
    if (!nombre.trim()) err.nombre = "Dinos cómo te gustaría que te llamemos.";
    if (!genero) err.genero = "Selecciona una opción para continuar.";

    setErrores(err);
    if (Object.keys(err).length === 0) {
      setPaso(2);
    }
  };

  const handleRegistro = async () => {
    const nuevosErrores = {};

    if (!correo.trim()) nuevosErrores.correo = "Ingresa tu correo electrónico.";
    if (!password) nuevosErrores.password = "Crea una contraseña segura.";
    else if (password.length < 6)
      nuevosErrores.password = "Usa al menos 6 caracteres.";
    if (!confirmarPassword)
      nuevosErrores.confirmarPassword = "Confirma tu contraseña.";
    else if (password !== confirmarPassword)
      nuevosErrores.confirmarPassword = "Las contraseñas no coinciden.";
    if (!aceptaPrivacidad)
      nuevosErrores.privacidad = "Acepta el aviso de privacidad para crear tu cuenta.";

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      mostrarAviso(
        "Casi listo",
        "Revisa los campos señalados para terminar de preparar tu cuenta en Lami."
      );
      return;
    }

    try {
      setCargando(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        correo.trim(),
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: nombre.trim(),
        correo: correo.trim(),
        pais,
        telefono: telefono.trim(),
        genero,
        createdAt: new Date(),
      });

      setModalExitoVisible(true);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        mostrarAviso(
          "Correo ya registrado",
          "Ya existe una cuenta con este correo en Lami. Puedes iniciar sesión directamente.",
          true
        );
      } else if (error.code === "auth/invalid-email") {
        mostrarAviso(
          "Correo no válido",
          "Verifica que tu dirección de correo esté escrita correctamente."
        );
      } else {
        mostrarAviso("No se pudo registrar", error.message);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient
      colors={["#F7FAFA", "#E9F6F4", "#DDF3F0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* NAVEGACIÓN SUPERIOR MINIMALISTA */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => (paso === 2 ? setPaso(1) : navigation.goBack())}
              style={styles.circleBtn}
            >
              <Ionicons name="arrow-back" size={20} color="#0F3D42" />
            </TouchableOpacity>

            {/* INDICADOR DE PROGRESO */}
            <View style={styles.stepsIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View
                style={[
                  styles.stepDot,
                  paso === 2 && styles.stepDotActive,
                ]}
              />
            </View>

            {/* Espaciador para mantener centrado el indicador */}
            <View style={{ width: 40 }} />
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
            {/* IDENTIDAD VISUAL CON EL LOGO DE LAMI */}
            <View style={styles.brandHeader}>
              <Image
                source={require("../assets/logo_lami.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <Text style={styles.sloganText}>
                Tu red de bienestar y terapia.
              </Text>
            </View>

            {/* CONTENEDOR TIPO BURBUJA ORGÁNICA */}
            <View style={styles.organicSheet}>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Paso {paso} de 2</Text>
              </View>

              {paso === 1 ? (
                <>
                  <Text style={styles.sheetTitle}>Hola, te damos la bienvenida</Text>
                  <Text style={styles.sheetSubtitle}>
                    Este es un espacio tranquilo pensado para acompañarte día a día.
                  </Text>

                  {/* NOMBRE */}
                  <Text style={styles.fieldLabel}>¿Cómo te llamamos?</Text>
                  <View
                    style={[
                      styles.softInputRow,
                      errores.nombre && styles.softInputError,
                    ]}
                  >
                    <Ionicons
                      name="leaf-outline"
                      size={18}
                      color="#53988E"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.softInput}
                      placeholder="Tu nombre o como prefieras"
                      placeholderTextColor="#8DA8A5"
                      value={nombre}
                      onChangeText={(t) => {
                        setNombre(t);
                        if (errores.nombre)
                          setErrores((p) => ({ ...p, nombre: null }));
                      }}
                    />
                  </View>
                  {errores.nombre && (
                    <Text style={styles.errorText}>{errores.nombre}</Text>
                  )}

                  {/* SEXO */}
                  <Text style={styles.fieldLabel}>Sexo</Text>
                  <View
                    style={[
                      styles.softPickerBox,
                      errores.genero && styles.softInputError,
                    ]}
                  >
                    <Picker
                      selectedValue={genero}
                      onValueChange={(val) => {
                        setGenero(val);
                        if (errores.genero)
                          setErrores((p) => ({ ...p, genero: null }));
                      }}
                    >
                      <Picker.Item label="Seleccionar" value="" />
                      <Picker.Item label="Femenino" value="Femenino" />
                      <Picker.Item label="Masculino" value="Masculino" />
                    </Picker>
                  </View>
                  {errores.genero && (
                    <Text style={styles.errorText}>{errores.genero}</Text>
                  )}

                  {/* PAÍS Y TELÉFONO */}
                  <Text style={styles.fieldLabel}>País</Text>
                  <View style={styles.softPickerBox}>
                    <Picker
                      selectedValue={pais}
                      onValueChange={(val) => setPais(val)}
                    >
                      <Picker.Item label="México" value="Mexico" />
                      <Picker.Item label="Otro" value="Otro" />
                    </Picker>
                  </View>

                  <Text style={styles.fieldLabel}>Teléfono celular (opcional)</Text>
                  <View style={styles.softInputRow}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#53988E"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.softInput}
                      placeholder="+52"
                      placeholderTextColor="#8DA8A5"
                      keyboardType="phone-pad"
                      value={telefono}
                      onChangeText={setTelefono}
                    />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={avanzarPaso2}
                    style={{ marginTop: 10 }}
                  >
                    <LinearGradient
                      colors={["#53988E", "#7BC8B8"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>Continuar</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Protege tu espacio</Text>
                  <Text style={styles.sheetSubtitle}>
                    Crea tu acceso personal. Puedes usar Lami por tu cuenta o
                    conectarte con un especialista cuando tú lo decidas.
                  </Text>

                  {/* CORREO */}
                  <Text style={styles.fieldLabel}>Correo electrónico</Text>
                  <View
                    style={[
                      styles.softInputRow,
                      errores.correo && styles.softInputError,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="#53988E"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.softInput}
                      placeholder="tucorreo@ejemplo.com"
                      placeholderTextColor="#8DA8A5"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={correo}
                      onChangeText={(t) => {
                        setCorreo(t);
                        if (errores.correo)
                          setErrores((p) => ({ ...p, correo: null }));
                      }}
                    />
                  </View>
                  {errores.correo && (
                    <Text style={styles.errorText}>{errores.correo}</Text>
                  )}

                  {/* CONTRASEÑA */}
                  <Text style={styles.fieldLabel}>Contraseña</Text>
                  <View
                    style={[
                      styles.softInputRow,
                      errores.password && styles.softInputError,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#53988E"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.softInput}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#8DA8A5"
                      secureTextEntry={!verPassword}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errores.password)
                          setErrores((p) => ({ ...p, password: null }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setVerPassword(!verPassword)}
                    >
                      <Ionicons
                        name={verPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#53988E"
                      />
                    </TouchableOpacity>
                  </View>
                  {errores.password && (
                    <Text style={styles.errorText}>{errores.password}</Text>
                  )}

                  {/* CONFIRMAR CONTRASEÑA */}
                  <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
                  <View
                    style={[
                      styles.softInputRow,
                      errores.confirmarPassword && styles.softInputError,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#53988E"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      style={styles.softInput}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor="#8DA8A5"
                      secureTextEntry={!verConfirmPassword}
                      value={confirmarPassword}
                      onChangeText={(t) => {
                        setConfirmarPassword(t);
                        if (errores.confirmarPassword)
                          setErrores((p) => ({
                            ...p,
                            confirmarPassword: null,
                          }));
                      }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setVerConfirmPassword(!verConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={
                          verConfirmPassword
                            ? "eye-outline"
                            : "eye-off-outline"
                        }
                        size={20}
                        color="#53988E"
                      />
                    </TouchableOpacity>
                  </View>
                  {errores.confirmarPassword && (
                    <Text style={styles.errorText}>
                      {errores.confirmarPassword}
                    </Text>
                  )}

                  {/* CHECKBOX PRIVACIDAD */}
                  <View style={styles.privacyRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setAceptaPrivacidad(!aceptaPrivacidad);
                        if (errores.privacidad)
                          setErrores((p) => ({ ...p, privacidad: null }));
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          aceptaPrivacidad && styles.checkboxActive,
                        ]}
                      >
                        {aceptaPrivacidad && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    <Text style={styles.privacyText}>
                      Acepto los{" "}
                      <Text
                        style={styles.privacyLink}
                        onPress={() => setMostrarTerminos(true)}
                      >
                        términos de uso y privacidad
                      </Text>
                    </Text>
                  </View>
                  {errores.privacidad && (
                    <Text style={styles.errorText}>{errores.privacidad}</Text>
                  )}

                  {/* BOTÓN FINAL */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={cargando}
                    onPress={handleRegistro}
                    style={{ marginTop: 12 }}
                  >
                    <LinearGradient
                      colors={["#0F3D42", "#53988E"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>
                        {cargando ? "Creando tu cuenta..." : "Unirme a Lami"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* PIE DE TARJETA */}
              <View style={styles.bottomLoginRow}>
                <Text style={styles.bottomLoginMuted}>
                  ¿Ya tienes una cuenta?{" "}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.bottomLoginLink}>Inicia sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* MODAL DE TÉRMINOS Y CONDICIONES */}
        <Modal
          visible={mostrarTerminos}
          transparent
          animationType="fade"
          onRequestClose={() => setMostrarTerminos(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>PRIVACIDAD Y USO</Text>
              </View>
              <Text style={styles.modalTitle}>Términos y condiciones</Text>

              <ScrollView style={{ maxHeight: 270, marginTop: 12 }}>
                <Text style={styles.termBullet}>
                  • <Text style={{ fontWeight: "700" }}>Uso libre y autónomo:</Text>{" "}
                  No necesitas contar con un psicólogo o especialista para
                  utilizar Lami. Todas las herramientas de autocuidado,
                  respiración y seguimiento emocional están disponibles para ti
                  de forma independiente.
                </Text>
                <Text style={styles.termBullet}>
                  • <Text style={{ fontWeight: "700" }}>Vinculación opcional:</Text>{" "}
                  Solo si en algún momento decides acudir a terapia y tu
                  especialista usa Lami, podrás enlazar tu cuenta mediante su
                  código y desvincularla cuando quieras. Así mismo, también te
                  recomendaremos especialistas cuando desees.
                </Text>
                <Text style={styles.termBullet}>
                  • <Text style={{ fontWeight: "700" }}>Confidencialidad:</Text>{" "}
                  Tus registros personales son privados y nunca se comparten con
                  terceros sin tu consentimiento.
                </Text>
                <Text style={styles.termBullet}>
                  • <Text style={{ fontWeight: "700" }}>Acompañamiento:</Text>{" "}
                  Lami es una red de apoyo y bienestar cotidiano; no reemplaza
                  atención médica ni intervenciones de emergencia.
                </Text>
              </ScrollView>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 14 }}
                onPress={() => {
                  setAceptaPrivacidad(true);
                  setErrores((p) => ({ ...p, privacidad: null }));
                  setMostrarTerminos(false);
                }}
              >
                <LinearGradient
                  colors={["#53988E", "#7BC8B8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Aceptar y continuar</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMostrarTerminos(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL DE AVISO / VALIDACIÓN */}
        <Modal
          visible={avisoModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setAvisoModal((p) => ({ ...p, visible: false }))
          }
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogSheet}>
              <View style={styles.softIconCircle}>
                <Ionicons name="leaf" size={28} color="#53988E" />
              </View>
              <Text style={styles.modalTitle}>{avisoModal.titulo}</Text>
              <Text style={styles.dialogBody}>{avisoModal.mensaje}</Text>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 8 }}
                onPress={() => {
                  const irLogin = avisoModal.irALogin;
                  setAvisoModal((p) => ({ ...p, visible: false }));
                  if (irLogin) {
                    navigation.navigate("Login", { email: correo.trim() });
                  }
                }}
              >
                <LinearGradient
                  colors={["#53988E", "#7BC8B8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {avisoModal.irALogin ? "Ir a iniciar sesión" : "Entendido"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL DE BIENVENIDA EXITOSA */}
        <Modal
          visible={modalExitoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogSheet}>
              <LinearGradient
                colors={["#53988E", "#9AE6DE"]}
                style={styles.successCircle}
              >
                <Ionicons name="checkmark" size={32} color="#0F3D42" />
              </LinearGradient>

              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>CUENTA LISTA</Text>
              </View>
              <Text style={styles.modalTitle}>
                ¡Te damos la bienvenida, {nombre.trim()}!
              </Text>
              <Text style={styles.dialogBody}>
                Tu cuenta fue creada con{" "}
                <Text style={{ fontWeight: "700", color: "#0F3D42" }}>
                  {correo.trim()}
                </Text>
                . Ya puedes iniciar sesión para comenzar.
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 8 }}
                onPress={() => {
                  setModalExitoVisible(false);
                  navigation.replace("Login", { email: correo.trim() });
                }}
              >
                <LinearGradient
                  colors={["#0F3D42", "#53988E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Ir a iniciar sesión</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F3D42",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 24,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#C5E3DF",
  },
  stepDotActive: {
    width: 36,
    backgroundColor: "#53988E",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  logoImg: {
    width: 170,
    height: 95,
  },
  sloganText: {
    fontSize: 13,
    color: "#2B5B5E",
    fontWeight: "600",
    marginTop: -6,
  },
  organicSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 22,
    shadowColor: "#0F3D42",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E9F6F4",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#53988E",
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F3D42",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#5A7577",
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B4B4F",
    marginBottom: 6,
  },
  softInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F9F8",
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DCEEEB",
  },
  softInputError: {
    borderColor: "#E11D48",
    backgroundColor: "#FFF1F2",
  },
  softInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F3D42",
  },
  softPickerBox: {
    backgroundColor: "#F2F9F8",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DCEEEB",
    overflow: "hidden",
  },
  errorText: {
    color: "#E11D48",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    fontWeight: "500",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#53988E",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#53988E",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: "#4A6668",
  },
  privacyLink: {
    color: "#0F3D42",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  primaryBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bottomLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  bottomLoginMuted: {
    fontSize: 13,
    color: "#6B8688",
  },
  bottomLoginLink: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F3D42",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 61, 66, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
  },
  modalBadge: {
    alignSelf: "center",
    backgroundColor: "#E9F6F4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  modalBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#53988E",
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F3D42",
    textAlign: "center",
  },
  termBullet: {
    fontSize: 13,
    color: "#4A6668",
    lineHeight: 20,
    marginBottom: 10,
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B8688",
  },
  dialogSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
  },
  softIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#E9F6F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dialogBody: {
    fontSize: 13,
    color: "#5A7577",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
});