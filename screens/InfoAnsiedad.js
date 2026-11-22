import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InfoBienestar({ navigation }) {
  const scrollViewRef = useRef(null);
  const [sectionPositions, setSectionPositions] = useState({});

  const handleRegisterSection = (key, event) => {
    const { y } = event.nativeEvent.layout;
    setSectionPositions((prev) => ({
      ...prev,
      [key]: y,
    }));
  };

  const handleScrollToSection = (key) => {
    const y = sectionPositions[key];
    if (y != null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: y - 80,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#4B2E83" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Nota psicoeducativa</Text>
            <Text style={styles.headerTitle}>Bienestar y autorregulación</Text>
          </View>

          <View style={{ width: 24 }} />
        </View>

        {/* SUBHEADER / METADATA */}
        <View style={styles.metaBar}>
          <View style={styles.metaPill}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color="#4B5563"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.metaText}>Lectura breve · Uso libre</Text>
          </View>

          <View style={styles.metaDivider} />

          <Text style={styles.metaSecondary}>
            Psicoeducación y autocuidado · No diagnóstico
          </Text>
        </View>

        {/* CONTENIDO */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.articleCard}>
            <Text style={styles.articleTag}>Autocuidado cotidiano en Lami</Text>

            <Text style={styles.title}>
              Cuerpo, emociones y seguimiento diario
            </Text>

            <Text style={styles.subtitle}>
              Un espacio neutral para comprender cómo responde tu organismo en
              el día a día, registrar tus hábitos de bienestar y decidir a tu
              ritmo si deseas apoyo profesional.
            </Text>

            {/* Nota aclaratoria */}
            <View style={styles.noticeBox}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#4B5563"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.noticeText}>
                Contenido psicoeducativo de uso libre con fines de autocuidado y
                prevención, elaborado con criterios alineados a guías abiertas
                de salud mental. No sustituye una consulta o evaluación clínica.
              </Text>
            </View>

            {/* ÍNDICE */}
            <View style={styles.indexBox}>
              <View style={styles.indexHeaderRow}>
                <Ionicons
                  name="list-circle-outline"
                  size={18}
                  color="#4F46E5"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.indexTitle}>Índice rápido</Text>
              </View>
              <View style={styles.indexItems}>
                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("queEs")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    ¿Qué significa registrar tu bienestar?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("intenso")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    Señales cotidianas de carga o tensión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("cuerpo")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="body-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    Cómo responde el cuerpo en el día a día
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("vsPeligro")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    Demanda diaria vs. amenaza real
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("conocer")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    Prevención y hábitos de autocuidado
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.indexItem}
                  onPress={() => handleScrollToSection("ayuda")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color="#4B5563"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.indexText}>
                    Cuándo sumar acompañamiento profesional
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sección 1 */}
            <View onLayout={(e) => handleRegisterSection("queEs", e)}>
              <Text style={styles.sectionTitle}>
                ¿Qué significa registrar tu bienestar?
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Las emociones, la energía y el ánimo cambian de forma natural
                según el descanso, el trabajo, los vínculos y las etapas de la
                vida. Tener un espacio neutro para observarlos ayuda a{" "}
                <Text style={styles.highlight}>identificar patrones</Text> sin
                juzgar lo que sientes.
              </Text>

              <Text style={styles.paragraph}>
                No necesitas estar en una crisis para usar Lami: el seguimiento
                diario y los ejercicios breves también sirven como prevención y
                cuidado cotidiano.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/cuidar.gif")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Sección 2 */}
            <View onLayout={(e) => handleRegisterSection("intenso", e)}>
              <Text style={styles.sectionTitle}>
                Señales cotidianas de carga o tensión
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Cuando se acumula el estrés, el cansancio o la preocupación, el
                organismo suele enviar señales tempranas como:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Cambios en el ritmo cardíaco o sensación de aceleración
                </Text>
                <Text style={styles.bulletItem}>
                  • Tensión muscular en hombros, cuello, mandíbula o estómago
                </Text>
                <Text style={styles.bulletItem}>
                  • Cansancio mental o dificultad para sostener la atención
                </Text>
                <Text style={styles.bulletItem}>
                  • Pensamientos que giran repetidamente sobre pendientes o
                  escenarios futuros
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Notar estas señales a tiempo te permite hacer una pausa breve
                antes de que el desgaste crezca.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/palpitar.gif")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Sección 3 */}
            <View onLayout={(e) => handleRegisterSection("cuerpo", e)}>
              <Text style={styles.sectionTitle}>
                Cómo responde el cuerpo en el día a día
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Desde una perspectiva psicobiológica, el cuerpo ajusta su nivel
                de activación ante exigencias externas o internas:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Libera mensajeros de activación (como adrenalina y cortisol)
                  para movilizar energía.
                </Text>
                <Text style={styles.bulletItem}>
                  • Modifica el patrón respiratorio, haciéndolo más rápido o
                  superficial.
                </Text>
                <Text style={styles.bulletItem}>
                  • Aumenta el tono muscular como preparación para responder.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Practicar respiración lenta, anclaje sensorial o pausas de
                descanso ayuda a{" "}
                <Text style={styles.highlight}>regular esa activación</Text> de
                forma gradual y segura.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/respirarRapido.gif")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Sección 4 */}
            <View onLayout={(e) => handleRegisterSection("vsPeligro", e)}>
              <Text style={styles.sectionTitle}>
                Demanda diaria vs. amenaza real
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                A menudo el cuerpo activa respuestas de alerta ante situaciones
                que no implican un peligro físico inmediato, por ejemplo:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Sobrecarga de tareas o fechas
                </Text>
                <Text style={styles.bulletItem}>
                  • Cambios de rutina o decisiones
                </Text>
                <Text style={styles.bulletItem}>
                  • Exigencias personales elevadas
                </Text>
                <Text style={styles.bulletItem}>• Dudas sobre el futuro</Text>
              </View>

              <Text style={styles.paragraph}>
                Separar{" "}
                <Text style={styles.highlight}>“una situación exigente”</Text>{" "}
                de <Text style={styles.highlight}>“una amenaza inmediata”</Text>{" "}
                facilita responder con mayor claridad y calma.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/real.jpg")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Sección 5 */}
            <View onLayout={(e) => handleRegisterSection("conocer", e)}>
              <Text style={styles.sectionTitle}>
                Prevención y hábitos de autocuidado
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Cuidar tu bienestar de forma preventiva consiste en sostener
                pequeñas prácticas constantes que fortalezcan tu equilibrio:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Registrar cómo te sientes sin exigirte estar bien todo el
                  tiempo.
                </Text>
                <Text style={styles.bulletItem}>
                  • Realizar ejercicios breves de regulación o reflexión cuando
                  lo necesites.
                </Text>
                <Text style={styles.bulletItem}>
                  • Respetar límites razonables de descanso y desconexión.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                El registro constante te da información útil para conocer qué
                hábitos te ayudan más en cada etapa.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/abrazo.jpg")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Sección 6 */}
            <View onLayout={(e) => handleRegisterSection("ayuda", e)}>
              <Text style={styles.sectionTitle}>
                Cuándo sumar acompañamiento profesional
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                En Lami puedes comenzar por tu autocuidado diario y, si en algún
                momento lo deseas,{" "}
                <Text style={styles.highlight}>
                  vincular a un especialista de salud mental
                </Text>{" "}
                para recibir acompañamiento profesional.
              </Text>

              <Text style={styles.paragraph}>
                Considera consultar con un profesional si notas que:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • El malestar o la tensión persisten durante semanas y afectan
                  tu rutina.
                </Text>
                <Text style={styles.bulletItem}>
                  • Tu descanso, concentración o vínculos se ven limitados con
                  frecuencia.
                </Text>
                <Text style={styles.bulletItem}>
                  • Sientes que necesitas orientación estructurada para abordar
                  lo que vives.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Buscar apoyo profesional es una opción válida y constructiva en
                cualquier momento de tu proceso.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/terapia.jpg")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Cierre */}
            <View style={styles.closingBox}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color="#4F46E5"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.closingText}>
                  Cuidarte cada día es un proceso gradual. Observar tus señales
                  y construir hábitos saludables te ayuda a avanzar con mayor
                  claridad.
                </Text>
                <Text style={styles.closingFootnote}>
                  Recurso psicoeducativo de uso libre y gratuito basado en
                  principios abiertos de bienestar y autorregulación; no
                  sustituye atención psicológica o médica profesional.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  metaBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  metaText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  metaSecondary: {
    fontSize: 11,
    color: "#6B7280",
    flexShrink: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  articleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  articleTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366F1",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 14,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
    lineHeight: 18,
  },
  indexBox: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  indexHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  indexTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  indexItems: {
    marginTop: 4,
  },
  indexItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  indexText: {
    fontSize: 13,
    color: "#374151",
    textDecorationLine: "underline",
    textDecorationColor: "#9CA3AF",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: "700",
    color: "#4F46E5",
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 4,
  },
  sectionImageBox: {
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionImage: {
    width: "100%",
    height: 180,
  },
  closingBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  closingText: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  closingFootnote: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
});
