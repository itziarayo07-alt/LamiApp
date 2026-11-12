import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DISTORSIONES = [
  {
    id: "Catastrofismo",
    icono: "🔮",
    titulo: "Catastrofismo",
    desc: "Anticipar que ocurrirá el peor escenario posible.",
  },
  {
    id: "Lectura de mente",
    icono: "🧠",
    titulo: "Lectura de mente",
    desc: "Asumir que otros me juzgan o piensan mal sin pruebas.",
  },
  {
    id: "Todo o nada",
    icono: "⚖️",
    titulo: "Pensamiento Todo o Nada",
    desc: "Ver las cosas como perfectas o como un fracaso total.",
  },
  {
    id: "Sobregeneralización",
    icono: "🔄",
    titulo: "Sobregeneralización",
    desc: "Creer que si algo salió mal una vez, siempre será así.",
  },
  {
    id: "Razonamiento emocional",
    icono: "💓",
    titulo: "Razonamiento emocional",
    desc: "Sentir miedo intenso y asumir por eso que hay peligro real.",
  },
];

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatearFecha(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function TecnicaABCDE({ navigation }) {
  // 1 = Diagnóstico (A-B-C) | 2 = Intervención (D-E) | 3 = Interpretación y Resumen | 4 = Tests Anteriores
  const [etapa, setEtapa] = useState(1);

  // Parte 1: Diagnóstico (A - B - C)
  const [eventoA, setEventoA] = useState("");
  const [creenciaB, setCreenciaB] = useState("");
  const [distorsion, setDistorsion] = useState(DISTORSIONES[0]);
  const [consecuenciaC, setConsecuenciaC] = useState("");
  const [intensidadInicial, setIntensidadInicial] = useState(7);

  // Parte 2: Intervención (D - E)
  const [debateEvidencia, setDebateEvidencia] = useState("");
  const [debateAmigo, setDebateAmigo] = useState("");
  const [efectoE, setEfectoE] = useState("");
  const [intensidadFinal, setIntensidadFinal] = useState(4);

  const [guardado, setGuardado] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const raw = await AsyncStorage.getItem("historialABCDE");
      const lista = raw ? JSON.parse(raw) : [];
      setHistorial(lista);
    } catch (e) {
      console.log("Error cargando historial ABCDE:", e);
    }
  };

  const avanzarAIntervencion = () => {
    if (!eventoA.trim() || !creenciaB.trim() || !consecuenciaC.trim()) {
      Alert.alert(
        "Campos incompletos",
        "Por favor completa los pasos A, B y C para realizar un diagnóstico preciso"
      );
      return;
    }
    setEtapa(2);
  };

  const avanzarAResultados = () => {
    if (!debateEvidencia.trim() || !efectoE.trim()) {
      Alert.alert(
        "Completa la intervención",
        "Por favor escribe las pruebas en el Debate (D) y tu nuevo pensamiento funcional (E)"
      );
      return;
    }
    setEtapa(3);
  };

  const calcularInterpretacionPara = (inicial, final) => {
    const reduccion = inicial - final;

    if (reduccion >= 3) {
      return {
        nivel: "REESTRUCTURACIÓN COGNITIVA EXITOSA",
        color: "#059669",
        bgBadge: "#D1FAE5",
        icono: "checkmark-circle",
        resumen: `Tu malestar emocional disminuyó significativamente en ${reduccion} puntos (pasó de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "Al cuestionar con evidencia real tu pensamiento automático, desactivaste la alarma de amenaza en tu sistema nervioso, permitiendo que la emoción se regule desde la razón.",
        recomendacion:
          "Lee en voz alta tu nuevo pensamiento funcional (E) cada vez que vuelva a aparecer la situación detonante (A).",
      };
    }

    if (reduccion >= 1) {
      return {
        nivel: "REGULACIÓN COGNITIVA EN PROCESO",
        color: "#7C3AED",
        bgBadge: "#EDE9FE",
        icono: "sparkles",
        resumen: `Lograste reducir tu tensión en ${reduccion} punto${
          reduccion === 1 ? "" : "s"
        } (pasó de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "En la Terapia Cognitivo-Conductual es normal que las creencias arraigadas no desaparezcan de inmediato. Sin embargo, haber identificado la distorsión cognitiva debilita el automatismo del miedo.",
        recomendacion:
          "Acompaña este cambio de perspectiva con 2 minutos de respiración diafragmática para que tu cuerpo termine de asimilar la calma.",
      };
    }

    return {
      nivel: "ALTA ACTIVACIÓN FISIOLÓGICA",
      color: "#D97706",
      bgBadge: "#FEF3C7",
      icono: "information-circle",
      resumen: `Tu intensidad emocional se mantuvo elevada (${final}/10).`,
      explicacion:
        "La literatura clínica explica que cuando la amígdala cerebral está muy activada, el malestar físico dificulta asimilar argumentos racionales en el primer intento.",
      recomendacion:
        "Antes de volver a debatir el pensamiento, realiza un ejercicio somático (como Respiración 4-7-8 o Anclaje con los sentidos) para bajar primero la tensión corporal.",
    };
  };

  const guardarHistorial = async () => {
    try {
      const raw = await AsyncStorage.getItem("historialABCDE");
      const lista = raw ? JSON.parse(raw) : [];
      const interp = calcularInterpretacionPara(
        intensidadInicial,
        intensidadFinal
      );

      const nuevoRegistro = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        eventoA,
        creenciaB,
        distorsion: distorsion.titulo,
        distorsionIcono: distorsion.icono,
        consecuenciaC,
        intensidadInicial,
        debateEvidencia,
        debateAmigo,
        efectoE,
        intensidadFinal,
        nivelInterpretacion: interp.nivel,
        resumenInterpretacion: interp.resumen,
      };
      const nuevaLista = [nuevoRegistro, ...lista];
      await AsyncStorage.setItem("historialABCDE", JSON.stringify(nuevaLista));
      setHistorial(nuevaLista);
      setGuardado(true);
      Alert.alert(
        "Diagnóstico guardado 💜",
        "Tu ejercicio ABCDE se guardó en la sección de Tests Anteriores.",
        [
          { text: "Quedarme aquí", style: "cancel" },
          {
            text: "Ver Tests Anteriores",
            onPress: () => {
              setExpandedId(nuevoRegistro.id);
              setEtapa(4);
            },
          },
        ]
      );
    } catch (e) {
      console.log("Error guardando ABCDE:", e);
    }
  };

  const eliminarRegistro = (id) => {
    Alert.alert(
      "Eliminar registro",
      "¿Estás seguro/a de que deseas eliminar este diagnóstico?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const filtrados = historial.filter((item) => item.id !== id);
              await AsyncStorage.setItem(
                "historialABCDE",
                JSON.stringify(filtrados)
              );
              setHistorial(filtrados);
            } catch (e) {
              console.log("Error eliminando registro:", e);
            }
          },
        },
      ]
    );
  };

  // Exportar a PDF (puede exportar 1 test específico o todos los tests guardados)
  const exportarAPDF = async (registrosAExportar, tituloReporte = "Reporte Clínico ABCDE") => {
    try {
      if (!registrosAExportar || registrosAExportar.length === 0) {
        return Alert.alert(
          "Sin registros",
          "No hay diagnósticos guardados para exportar a PDF."
        );
      }

      const bloquesHtml = registrosAExportar
        .map((item, idx) => {
          const interp = calcularInterpretacionPara(
            item.intensidadInicial,
            item.intensidadFinal
          );
          return `
            <div style="border: 1px solid #DDD6FE; border-radius: 14px; padding: 18px; margin-bottom: 22px; background-color: #FFFFFF; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F3E8FF; padding-bottom: 10px; margin-bottom: 12px;">
                <div>
                  <span style="font-size: 12px; color: #6B7280; font-weight: bold;">REGISTRO #${
                    registrosAExportar.length - idx
                  } • ${escapeHtml(formatearFecha(item.fecha))}</span>
                  <h3 style="margin: 4px 0 0 0; color: #4C1D95; font-size: 16px;">${escapeHtml(
                    interp.nivel
                  )}</h3>
                </div>
                <div style="background-color: #F3E8FF; padding: 8px 14px; border-radius: 10px; text-align: center;">
                  <span style="font-size: 11px; color: #5B21B6; display: block;">Malestar (C → E)</span>
                  <strong style="font-size: 16px; color: #4C1D95;">${
                    item.intensidadInicial
                  }/10 ➔ ${item.intensidadFinal}/10</strong>
                </div>
              </div>

              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; color: #B45309; font-size: 13px; text-transform: uppercase;">I. El Diagnóstico (A - B - C)</h4>
                <p style="margin: 4px 0; font-size: 13px;"><strong>• A (Situación Activadora):</strong> ${escapeHtml(
                  item.eventoA
                )}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>• B (Pensamiento Automático):</strong> <span style="text-decoration: line-through; color: #991B1B;">"${escapeHtml(
                  item.creenciaB
                )}"</span></p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>• Distorsión Cognitiva:</strong> ${escapeHtml(
                  item.distorsion
                )}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>• C (Consecuencia Emocional/Física):</strong> ${escapeHtml(
                  item.consecuenciaC
                )} <em>(Intensidad inicial: ${item.intensidadInicial}/10)</em></p>
              </div>

              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; color: #047857; font-size: 13px; text-transform: uppercase;">II. La Intervención (D - E)</h4>
                <p style="margin: 4px 0; font-size: 13px;"><strong>• D (Debate / Evidencia Racional):</strong> ${escapeHtml(
                  item.debateEvidencia
                )}</p>
                ${
                  item.debateAmigo && item.debateAmigo.trim()
                    ? `<p style="margin: 4px 0; font-size: 13px;"><strong>• D (Perspectiva Compasiva):</strong> ${escapeHtml(
                        item.debateAmigo
                      )}</p>`
                    : ""
                }
                <p style="margin: 4px 0; font-size: 13px;"><strong>• E (Nuevo Pensamiento Funcional):</strong> <strong style="color: #065F46;">"${escapeHtml(
                  item.efectoE
                )}"</strong> <em>(Intensidad final: ${
            item.intensidadFinal
          }/10)</em></p>
              </div>

              <div style="background-color: #F5F3FF; border-radius: 10px; padding: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #4C1D95;"><strong>🩺 Interpretación Clínica:</strong> ${escapeHtml(
                  interp.resumen
                )} ${escapeHtml(interp.explicacion)}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #374151;"><strong>💡 Recomendación:</strong> ${escapeHtml(
                  interp.recomendacion
                )}</p>
              </div>
            </div>
          `;
        })
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
          </head>
          <body style="font-family: Arial, sans-serif; padding: 24px; color: #1F2937; background-color: #FAF5FF;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #DDD6FE; padding-bottom: 14px;">
              <span style="background-color: #EDE9FE; color: #6D28D9; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: bold;">
                LAMIAPP • REESTRUCTURACIÓN COGNITIVA
              </span>
              <h1 style="color: #1F1147; margin: 8px 0 4px 0; font-size: 24px;">${escapeHtml(
                tituloReporte
              )}</h1>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">
                Generado el ${new Date().toLocaleDateString("es-MX")} • Total de registros: ${
        registrosAExportar.length
      }
              </p>
            </div>

            ${bloquesHtml}
          </body>
        </html>
      `;

      const { uri: pdfUri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Exportar Diagnóstico ABCDE (PDF)",
        UTI: "com.adobe.pdf",
      });
    } catch (e) {
      console.log("Error exportando PDF ABCDE:", e);
      Alert.alert("Error al generar PDF", String(e));
    }
  };

  const exportarActualAPDF = () => {
    const registroActual = {
      id: "actual",
      fecha: new Date().toISOString(),
      eventoA,
      creenciaB,
      distorsion: distorsion.titulo,
      consecuenciaC,
      intensidadInicial,
      debateEvidencia,
      debateAmigo,
      efectoE,
      intensidadFinal,
    };
    exportarAPDF([registroActual], "Diagnóstico Clínico ABCDE");
  };

  const reiniciarEjercicio = () => {
    setEventoA("");
    setCreenciaB("");
    setDistorsion(DISTORSIONES[0]);
    setConsecuenciaC("");
    setIntensidadInicial(7);
    setDebateEvidencia("");
    setDebateAmigo("");
    setEfectoE("");
    setIntensidadFinal(4);
    setGuardado(false);
    setEtapa(1);
  };

  const interpretacion = calcularInterpretacionPara(
    intensidadInicial,
    intensidadFinal
  );

  return (
    <LinearGradient colors={["#F5F3FF", "#FDF2F8"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#4C1D95" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBadge}>
              TERAPIA COGNITIVA (ELLIS)
            </Text>
            <Text style={styles.headerTitle}>Técnica Clínica ABCDE</Text>
          </View>

          {/* BOTÓN RÁPIDO A HISTORIAL */}
          <TouchableOpacity
            style={[
              styles.historyHeaderBtn,
              etapa === 4 && styles.historyHeaderBtnActive,
            ]}
            onPress={() => setEtapa(4)}
          >
            <Ionicons
              name="folder-open-outline"
              size={16}
              color={etapa === 4 ? "#FFF" : "#5B21B6"}
            />
            <Text
              style={[
                styles.historyHeaderBtnText,
                etapa === 4 && { color: "#FFF" },
              ]}
            >
              Historial ({historial.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* STEPPER DE LAS 4 SECCIONES */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepPill, etapa === 1 && styles.stepPillActive]}
            onPress={() => setEtapa(1)}
          >
            <Text
              style={[
                styles.stepPillText,
                etapa === 1 && styles.stepPillTextActive,
              ]}
            >
              1. A-B-C
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stepPill, etapa === 2 && styles.stepPillActive]}
            onPress={() => {
              if (etapa === 2 || etapa === 3) setEtapa(2);
              else avanzarAIntervencion();
            }}
          >
            <Text
              style={[
                styles.stepPillText,
                etapa === 2 && styles.stepPillTextActive,
              ]}
            >
              2. D-E
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stepPill, etapa === 3 && styles.stepPillActive]}
            onPress={() => {
              if (etapa === 3) setEtapa(3);
              else if (etapa === 2) avanzarAResultados();
              else avanzarAIntervencion();
            }}
          >
            <Text
              style={[
                styles.stepPillText,
                etapa === 3 && styles.stepPillTextActive,
              ]}
            >
              3. Resultado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stepPill, etapa === 4 && styles.stepPillActive]}
            onPress={() => setEtapa(4)}
          >
            <Text
              style={[
                styles.stepPillText,
                etapa === 4 && styles.stepPillTextActive,
              ]}
            >
              4. Anteriores
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= ETAPA 1: DIAGNÓSTICO (A - B - C) ================= */}
          {etapa === 1 && (
            <>
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>
                  Parte 1: El Diagnóstico (A - B - C)
                </Text>
                <Text style={styles.introText}>
                  En psicología cognitiva, nuestra ansiedad no la provoca
                  directamente lo que ocurre (A), sino cómo lo interpretamos (B).
                  Identifiquemos los 3 elementos de tu malestar actual.
                </Text>
              </View>

              {/* PASO A */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View style={[styles.letterBadge, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={[styles.letterText, { color: "#1D4ED8" }]}>A</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Acontecimiento Activador
                    </Text>
                    <Text style={styles.cardSub}>
                      ¿Qué hecho ocurrió o qué situación futura te preocupa?
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: Mañana tengo una exposición o siento que tengo demasiados pendientes..."
                  placeholderTextColor="#9CA3AF"
                  value={eventoA}
                  onChangeText={setEventoA}
                />
              </View>

              {/* PASO B */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View style={[styles.letterBadge, { backgroundColor: "#FEE2E2" }]}>
                    <Text style={[styles.letterText, { color: "#B91C1C" }]}>B</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Creencia o Pensamiento Automático
                    </Text>
                    <Text style={styles.cardSub}>
                      ¿Qué te dices a ti mismo/a sobre esa situación? ¿Qué es lo
                      peor que temes que pase?
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: 'Me voy a bloquear, todos notarán mis nervios y saldrá terrible'..."
                  placeholderTextColor="#9CA3AF"
                  value={creenciaB}
                  onChangeText={setCreenciaB}
                />

                <Text style={styles.subLabel}>
                  Selecciona la trampa mental (distorsión cognitiva) que más se
                  acerca a tu pensamiento:
                </Text>

                {DISTORSIONES.map((item) => {
                  const activo = distorsion.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.distortionItem,
                        activo && styles.distortionItemActive,
                      ]}
                      onPress={() => setDistorsion(item)}
                    >
                      <Text style={styles.distortionIcon}>{item.icono}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.distortionTitle,
                            activo && { color: "#5B21B6" },
                          ]}
                        >
                          {item.titulo}
                        </Text>
                        <Text style={styles.distortionDesc}>{item.desc}</Text>
                      </View>
                      <Ionicons
                        name={activo ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={activo ? "#7C3AED" : "#9CA3AF"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* PASO C */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View style={[styles.letterBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.letterText, { color: "#B45309" }]}>C</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Consecuencias Emocionales y Físicas
                    </Text>
                    <Text style={styles.cardSub}>
                      ¿Qué emociones sientes y cómo reacciona tu cuerpo?
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: Siento angustia, presión en el pecho, tensión en los hombros y ganas de evitarlo..."
                  placeholderTextColor="#9CA3AF"
                  value={consecuenciaC}
                  onChangeText={setConsecuenciaC}
                />

                <Text style={styles.subLabel}>
                  Intensidad de tu ansiedad / malestar ahora mismo (1 al 10):
                </Text>
                <View style={styles.scaleRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const activo = intensidadInicial === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.scaleBtn,
                          activo && styles.scaleBtnActiveRed,
                        ]}
                        onPress={() => setIntensidadInicial(num)}
                      >
                        <Text
                          style={[
                            styles.scaleBtnText,
                            activo && { color: "#FFF" },
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={avanzarAIntervencion}
              >
                <Text style={styles.primaryBtnText}>
                  Continuar a La Intervención (D - E) →
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ================= ETAPA 2: LA INTERVENCIÓN (D - E) ================= */}
          {etapa === 2 && (
            <>
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>
                  Parte 2: La Intervención (D - E)
                </Text>
                <Text style={styles.introText}>
                  Ahora pondremos a prueba tu creencia (B) mediante el
                  cuestionamiento (D) para construir un efecto
                  emocional más saludable (E).
                </Text>
              </View>

              {/* RECORDATORIO DE B */}
              <View style={styles.quoteBox}>
                <Text style={styles.quoteLabel}>
                  Pensamiento a cuestionar ({distorsion.icono} {distorsion.titulo}):
                </Text>
                <Text style={styles.quoteText}>"{creenciaB}"</Text>
              </View>

              {/* PASO D */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View style={[styles.letterBadge, { backgroundColor: "#EDE9FE" }]}>
                    <Text style={[styles.letterText, { color: "#6D28D9" }]}>D</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Debate / Disputa Racional
                    </Text>
                    <Text style={styles.cardSub}>
                      Cuestionemos con objetividad la validez de ese pensamiento.
                    </Text>
                  </View>
                </View>

                <Text style={styles.fieldQuestion}>
                  1. Debate: ¿Qué pruebas reales tienes de que esto
                  pasará exactamente como lo temes, o qué veces anteriores has
                  logrado salir adelante?
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: En realidad me he preparado antes y aunque me puse nervioso/a, pude terminar bien..."
                  placeholderTextColor="#9CA3AF"
                  value={debateEvidencia}
                  onChangeText={setDebateEvidencia}
                />

                <Text style={[styles.fieldQuestion, { marginTop: 12 }]}>
                  2. Perspectiva compasiva: Si alguien que quieres mucho tuviera
                  este mismo miedo, ¿qué le dirías?
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: Le diría que equivocarse un poco es humano y no define su valor..."
                  placeholderTextColor="#9CA3AF"
                  value={debateAmigo}
                  onChangeText={setDebateAmigo}
                />
              </View>

              {/* PASO E */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View style={[styles.letterBadge, { backgroundColor: "#D1FAE5" }]}>
                    <Text style={[styles.letterText, { color: "#047857" }]}>E</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Efecto y Pensamiento Funcional
                    </Text>
                    <Text style={styles.cardSub}>
                      Escribe tu nueva conclusión realista y evalúa cómo cambió
                      tu nivel de tensión.
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: 'Es normal sentir nervios, pero estoy preparado/a y puedo avanzar paso a paso sin exigirme perfección'..."
                  placeholderTextColor="#9CA3AF"
                  value={efectoE}
                  onChangeText={setEfectoE}
                />

                <Text style={styles.subLabel}>
                  Después de debatir el pensamiento, ¿en qué nivel (1 al 10)
                  sientes tu ansiedad ahora? (Antes: {intensidadInicial}/10)
                </Text>
                <View style={styles.scaleRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const activo = intensidadFinal === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.scaleBtn,
                          activo && styles.scaleBtnActiveGreen,
                        ]}
                        onPress={() => setIntensidadFinal(num)}
                      >
                        <Text
                          style={[
                            styles.scaleBtnText,
                            activo && { color: "#FFF" },
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.rowBtns}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setEtapa(1)}
                >
                  <Text style={styles.secondaryBtnText}>← Volver a A-B-C</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={avanzarAResultados}
                >
                  <Text style={styles.primaryBtnText}>
                    Ver Diagnóstico Final →
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ================= ETAPA 3: INTERPRETACIÓN Y RESUMEN ================= */}
          {etapa === 3 && (
            <>
              {/* TARJETA DE INTERPRETACIÓN CLÍNICA */}
              <View style={styles.resultCard}>
                <View
                  style={[
                    styles.resultBadge,
                    { backgroundColor: interpretacion.bgBadge },
                  ]}
                >
                  <Ionicons
                    name={interpretacion.icono}
                    size={16}
                    color={interpretacion.color}
                  />
                  <Text
                    style={[
                      styles.resultBadgeText,
                      { color: interpretacion.color },
                    ]}
                  >
                    {interpretacion.nivel}
                  </Text>
                </View>

                <Text style={styles.resultMainTitle}>
                  Interpretación de Resultados
                </Text>

                {/* COMPARADOR DE INTENSIDAD */}
                <View style={styles.metricsBox}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Malestar Inicial (C)</Text>
                    <Text style={[styles.metricValue, { color: "#DC2626" }]}>
                      {intensidadInicial}/10
                    </Text>
                  </View>

                  <Ionicons name="arrow-forward" size={24} color="#6B7280" />

                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Malestar Final (E)</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: interpretacion.color },
                      ]}
                    >
                      {intensidadFinal}/10
                    </Text>
                  </View>
                </View>

                <Text style={styles.resultSummaryText}>
                  {interpretacion.resumen}
                </Text>

                <View style={styles.clinicalBox}>
                  <Text style={styles.clinicalTitle}>
                    🩺 Análisis Clínico:
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.explicacion}
                  </Text>
                  <Text style={[styles.clinicalTitle, { marginTop: 10 }]}>
                    💡 Recomendación Terapéutica:
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.recomendacion}
                  </Text>
                </View>
              </View>

              {/* RESUMEN DEL DIAGNÓSTICO ABCDE */}
              <View style={styles.card}>
                <Text style={styles.summaryHeaderTitle}>
                  📋 Resumen de tu Diagnóstico ABCDE
                </Text>

                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryTag}>
                    I. El Diagnóstico (A - B - C)
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>• A (Situación): </Text>
                    {eventoA}
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>
                      • B (Pensamiento automático):{" "}
                    </Text>
                    <Text style={styles.strikeText}>"{creenciaB}"</Text>
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>• Distorsión identificada: </Text>
                    {distorsion.icono} {distorsion.titulo}
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>
                      • C (Consecuencia inicial):{" "}
                    </Text>
                    {consecuenciaC} (Intensidad: {intensidadInicial}/10)
                  </Text>
                </View>

                <View
                  style={[
                    styles.summaryBlock,
                    { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                  ]}
                >
                  <Text style={[styles.summaryTag, { color: "#047857" }]}>
                    II. La Intervención (D - E)
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>• D (Evidencia racional): </Text>
                    {debateEvidencia}
                  </Text>
                  {debateAmigo.trim() ? (
                    <Text style={styles.summaryLine}>
                      <Text style={styles.bold}>• D (Visión compasiva): </Text>
                      {debateAmigo}
                    </Text>
                  ) : null}
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>
                      • E (Nuevo pensamiento funcional):{" "}
                    </Text>
                    <Text style={{ color: "#065F46", fontWeight: "700" }}>
                      "{efectoE}"
                    </Text>
                  </Text>
                </View>
              </View>

              {/* BOTONES FINALES */}
              <View style={styles.footerBtns}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={guardarHistorial}
                  disabled={guardado}
                >
                  <Text style={styles.saveBtnText}>
                    {guardado
                      ? "Diagnóstico Guardado ✓"
                      : "Guardar en Tests Anteriores"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={exportarActualAPDF}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFF" />
                  <Text style={styles.pdfBtnText}>
                    Exportar este diagnóstico a PDF
                  </Text>
                </TouchableOpacity>

                <View style={styles.rowBtns}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={reiniciarEjercicio}
                  >
                    <Text style={styles.secondaryBtnText}>Nuevo ejercicio</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.secondaryBtn,
                      { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" },
                    ]}
                    onPress={() => setEtapa(4)}
                  >
                    <Text
                      style={[styles.secondaryBtnText, { color: "#5B21B6" }]}
                    >
                      Ver Tests Anteriores
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ================= ETAPA 4: TESTS ANTERIORES + EXPORTAR PDF ================= */}
          {etapa === 4 && (
            <>
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>
                  📂 Historial de Tests ABCDE Anteriores
                </Text>
                <Text style={styles.introText}>
                  Consulta tus registros previos de reestructuración cognitiva y
                  expórtalos en formato PDF para tu seguimiento personal o para
                  compartirlos en consulta.
                </Text>
              </View>

              {historial.length > 0 && (
                <TouchableOpacity
                  style={[styles.pdfBtn, { marginBottom: 14 }]}
                  onPress={() =>
                    exportarAPDF(
                      historial,
                      "Historial Completo de Diagnósticos ABCDE"
                    )
                  }
                >
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.pdfBtnText}>
                    📄 Exportar todos los tests a PDF ({historial.length})
                  </Text>
                </TouchableOpacity>
              )}

              {historial.length === 0 ? (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color="#C4B5FD"
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: "#374151",
                      marginTop: 10,
                    }}
                  >
                    Aún no tienes tests guardados
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      textAlign: "center",
                      marginTop: 4,
                      marginBottom: 16,
                    }}
                  >
                    Completa las fases A-B-C y D-E y presiona "Guardar en Tests
                    Anteriores" para verlos aquí.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { paddingHorizontal: 24 }]}
                    onPress={() => setEtapa(1)}
                  >
                    <Text style={styles.primaryBtnText}>
                      Realizar un nuevo test ABCDE
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                historial.map((item, index) => {
                  const abierto = expandedId === item.id;
                  const interp = calcularInterpretacionPara(
                    item.intensidadInicial,
                    item.intensidadFinal
                  );

                  return (
                    <View key={item.id} style={styles.card}>
                      <TouchableOpacity
                        style={styles.historyItemHeader}
                        onPress={() =>
                          setExpandedId(abierto ? null : item.id)
                        }
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyDate}>
                            #{historial.length - index} •{" "}
                            {formatearFecha(item.fecha)}
                          </Text>
                          <Text
                            style={styles.historyTitle}
                            numberOfLines={abierto ? undefined : 1}
                          >
                            {item.eventoA}
                          </Text>
                          <Text
                            style={[
                              styles.historyStatus,
                              { color: interp.color },
                            ]}
                          >
                            {interp.nivel}
                          </Text>
                        </View>

                        <View style={styles.historyBadgeBox}>
                          <Text style={styles.historyScoreLabel}>C → E</Text>
                          <Text style={styles.historyScoreValue}>
                            {item.intensidadInicial} ➔ {item.intensidadFinal}
                          </Text>
                        </View>

                        <Ionicons
                          name={abierto ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>

                      {abierto && (
                        <View style={{ marginTop: 14 }}>
                          <View style={styles.summaryBlock}>
                            <Text style={styles.summaryTag}>
                              I. El Diagnóstico (A - B - C)
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>• A (Situación): </Text>
                              {item.eventoA}
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>
                                • B (Pensamiento):{" "}
                              </Text>
                              <Text style={styles.strikeText}>
                                "{item.creenciaB}"
                              </Text>
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>• Distorsión: </Text>
                              {item.distorsionIcono || "🧠"} {item.distorsion}
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>
                                • C (Consecuencia):{" "}
                              </Text>
                              {item.consecuenciaC} ({item.intensidadInicial}/10)
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.summaryBlock,
                              {
                                backgroundColor: "#ECFDF5",
                                borderColor: "#A7F3D0",
                              },
                            ]}
                          >
                            <Text
                              style={[styles.summaryTag, { color: "#047857" }]}
                            >
                              II. La Intervención (D - E)
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>• D (Evidencia): </Text>
                              {item.debateEvidencia}
                            </Text>
                            {item.debateAmigo ? (
                              <Text style={styles.summaryLine}>
                                <Text style={styles.bold}>
                                  • D (Visión compasiva):{" "}
                                </Text>
                                {item.debateAmigo}
                              </Text>
                            ) : null}
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>
                                • E (Pensamiento funcional):{" "}
                              </Text>
                              <Text
                                style={{ color: "#065F46", fontWeight: "700" }}
                              >
                                "{item.efectoE}"
                              </Text>{" "}
                              ({item.intensidadFinal}/10)
                            </Text>
                          </View>

                          <View style={styles.clinicalBox}>
                            <Text style={styles.clinicalTitle}>
                              🩺 Interpretación:
                            </Text>
                            <Text style={styles.clinicalBody}>
                              {interp.resumen} {interp.explicacion}
                            </Text>
                          </View>

                          <View style={[styles.rowBtns, { marginTop: 12 }]}>
                            <TouchableOpacity
                              style={[
                                styles.pdfSingleBtn,
                                { flex: 1 },
                              ]}
                              onPress={() =>
                                exportarAPDF(
                                  [item],
                                  `Diagnóstico ABCDE - ${formatearFecha(
                                    item.fecha
                                  )}`
                                )
                              }
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={16}
                                color="#4C1D95"
                              />
                              <Text style={styles.pdfSingleBtnText}>
                                Exportar este PDF
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => eliminarRegistro(item.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    backgroundColor: "#FFFFFF",
    padding: 9,
    borderRadius: 14,
    elevation: 2,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1F1147",
  },
  historyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  historyHeaderBtnActive: {
    backgroundColor: "#7C3AED",
  },
  historyHeaderBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5B21B6",
  },
  stepperContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  stepPillActive: {
    backgroundColor: "#7C3AED",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  stepPillTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
    elevation: 2,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F1147",
    marginBottom: 4,
  },
  introText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  letterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  letterBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  letterText: {
    fontSize: 20,
    fontWeight: "900",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  cardSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    minHeight: 75,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#1F2937",
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 14,
    marginBottom: 8,
  },
  distortionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  distortionItemActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#8B5CF6",
  },
  distortionIcon: {
    fontSize: 22,
  },
  distortionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  distortionDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  scaleBtn: {
    width: 30,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  scaleBtnActiveRed: {
    backgroundColor: "#EF4444",
  },
  scaleBtnActiveGreen: {
    backgroundColor: "#10B981",
  },
  scaleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  quoteBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#7F1D1D",
  },
  fieldQuestion: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  primaryBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  rowBtns: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    marginBottom: 10,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  resultMainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  resultSummaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    lineHeight: 20,
  },
  clinicalBox: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 14,
  },
  clinicalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4C1D95",
    marginBottom: 4,
  },
  clinicalBody: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },
  summaryHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryBlock: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  summaryTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryLine: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    lineHeight: 19,
  },
  bold: {
    fontWeight: "700",
    color: "#111827",
  },
  strikeText: {
    textDecorationLine: "line-through",
    color: "#991B1B",
  },
  footerBtns: {
    gap: 8,
  },
  saveBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    elevation: 2,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pdfBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6D28D9",
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 2,
  },
  pdfBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  historyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 2,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  historyBadgeBox: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  historyScoreLabel: {
    fontSize: 10,
    color: "#6D28D9",
    fontWeight: "700",
  },
  historyScoreValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4C1D95",
  },
  pdfSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EDE9FE",
    paddingVertical: 11,
    borderRadius: 12,
  },
  pdfSingleBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4C1D95",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    padding: 11,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
