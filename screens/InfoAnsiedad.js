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

export default function InfoAnsiedad({ navigation }) {
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
            <Text style={styles.headerTitle}>Ansiedad y cuerpo</Text>
          </View>

          {/* espacio para balancear el header */}
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
            <Text style={styles.metaText}>Lectura breve</Text>
          </View>

          <View style={styles.metaDivider} />

          <Text style={styles.metaSecondary}>
            Uso psicoeducativo · No diagnóstico
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
            <Text style={styles.articleTag}>Comprender la ansiedad</Text>

            <Text style={styles.title}>Descubre cómo se da la ansiedad</Text>

            <Text style={styles.subtitle}>
              Un espacio para entender qué es la ansiedad y por qué tu cuerpo
              reacciona como lo hace. Conocerla también es una forma de cuidarte.
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
                Esta información es psicoeducativa y no reemplaza una valoración
                profesional individual.
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
                    ¿Qué es la ansiedad?
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
                    Por qué se siente tan intensa
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
                    Qué pasa en tu cuerpo
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
                    Ansiedad vs. peligro real
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
                    Conocer tu ansiedad
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
                  <Text style={styles.indexText}>Cuándo pedir ayuda</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sección 1 */}
            <View onLayout={(e) => handleRegisterSection("queEs", e)}>
              <Text style={styles.sectionTitle}>¿Qué es la ansiedad?</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                La ansiedad es una respuesta natural de tu cuerpo cuando percibe
                peligro, cambios o situaciones importantes. No es que estés{" "}
                <Text style={styles.highlight}>rota</Text> ni que haya algo malo
                contigo: es tu sistema intentando protegerte, a veces con demasiada
                intensidad.
              </Text>

              <Text style={styles.paragraph}>
                Imagina que tienes una alarma interna. Cuando algo te preocupa,
                esa alarma se enciende y tu cuerpo se prepara para reaccionar.
                El problema no es la alarma en sí, sino cuando se activa muy
                seguido o muy fuerte.
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
                ¿Por qué se siente tan intenso?
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Cuando aparece la ansiedad, tu cuerpo entra en modo{" "}
                <Text style={styles.highlight}>“alerta”</Text>. Esto puede hacer
                que notes cosas como:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Palpitaciones o corazón acelerado
                </Text>
                <Text style={styles.bulletItem}>
                  • Tensión en el cuerpo o temblores
                </Text>
                <Text style={styles.bulletItem}>
                  • Sensación de nudo en la garganta o en el estómago
                </Text>
                <Text style={styles.bulletItem}>
                  • Dificultad para concentrarte
                </Text>
                <Text style={styles.bulletItem}>
                  • Pensamientos que se repiten una y otra vez
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Todo esto es parte de la misma reacción: tu cuerpo cree que
                necesitas defenderte de algo y se activa para ayudarte, aunque
                a veces lo haga en momentos donde no hay un peligro real.
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
                Qué pasa en tu cuerpo cuando tienes ansiedad
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Algunas cosas que ocurren por dentro cuando se activa la
                ansiedad son:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Se liberan hormonas como la adrenalina y el cortisol.
                </Text>
                <Text style={styles.bulletItem}>
                  • Tu respiración puede volverse más rápida o superficial.
                </Text>
                <Text style={styles.bulletItem}>
                  • Tus músculos se tensan, como si te prepararas para correr o
                  defenderte.
                </Text>
                <Text style={styles.bulletItem}>
                  • Tu mente intenta anticipar todo lo que podría salir mal.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                No significa que “pierdas el control”, sino que tu sistema está
                reaccionando con demasiada intensidad. Por eso las técnicas de
                respiración, el movimiento suave y los ejercicios de atención al
                presente pueden ayudarte a enviarle el mensaje de{" "}
                <Text style={styles.highlight}>“ya pasó, estoy a salvo”</Text>.
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
                Ansiedad vs. peligro real
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                La ansiedad no siempre aparece cuando hay un peligro real. A
                veces se activa por:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Recuerdos difíciles</Text>
                <Text style={styles.bulletItem}>
                  • Preocupaciones sobre el futuro
                </Text>
                <Text style={styles.bulletItem}>
                  • Exigencias internas muy altas
                </Text>
                <Text style={styles.bulletItem}>
                  • Cambios o situaciones nuevas
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Tu cuerpo responde como si todo eso fuera una amenaza real, pero
                muchas veces solo estás frente a una situación retadora, no
                peligrosa. Aprender a distinguir entre{" "}
                <Text style={styles.highlight}>“estoy en peligro”</Text> y{" "}
                <Text style={styles.highlight}>“esto solo me da miedo”</Text> es
                parte del proceso de sanar.
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
                Conocer tu ansiedad es una forma de cuidarte
              </Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Entender lo que te pasa no hace que desaparezca de inmediato,
                pero sí puede ayudarte a:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • Dejar de pelear contigo misma por sentir ansiedad.
                </Text>
                <Text style={styles.bulletItem}>
                  • Reconocer tus señales tempranas y darte pausas a tiempo.
                </Text>
                <Text style={styles.bulletItem}>
                  • Buscar herramientas que realmente se adapten a ti.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Puedes usar esta app como un espacio para observarte, respirar,
                soltar un poquito de tensión y recordar que no estás sola en esto.
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
              <Text style={styles.sectionTitle}>¿Cuándo pedir ayuda?</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.paragraph}>
                Pedir ayuda no significa que no puedes sola, significa que{" "}
                <Text style={styles.highlight}>
                  no tienes por qué hacerlo sola
                </Text>
                .
              </Text>

              <Text style={styles.paragraph}>
                Puede ser buen momento de hablar con una profesional de la salud
                mental si:
              </Text>

              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  • La ansiedad interfiere con tus estudios, trabajo o relaciones.
                </Text>
                <Text style={styles.bulletItem}>
                  • Sientes miedo casi todos los días y te cuesta descansar.
                </Text>
                <Text style={styles.bulletItem}>
                  • Evitas muchas cosas por miedo a cómo te vas a sentir.
                </Text>
                <Text style={styles.bulletItem}>
                  • Te sientes sobrepasada y sin fuerzas para seguir el día.
                </Text>
              </View>

              <Text style={styles.paragraph}>
                Buscar ayuda es un acto de valentía y autocuidado. Tú mereces
                estar acompañada en este proceso.
              </Text>

              <View style={styles.sectionImageBox}>
                <Image
                  source={require("../assets/informativa/terapia.jpg")}
                  style={styles.sectionImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Cuadro donde esta el cierre */}
            <View style={styles.closingBox}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color="#4F46E5"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.closingText}>
                  No eres tu ansiedad. Eres mucho más que lo que estás sintiendo
                  hoy. Paso a pasito, estás aprendiendo a cuidarte mejor.
                </Text>
                <Text style={styles.closingFootnote}>
                  Esta sección no sustituye terapia ni evaluación profesional. Si
                  lo necesitas, buscar ayuda es un paso muy valioso.
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
    height: 180, // mismo tamaño para todos los GIFs / imágenes
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
  },
});
 