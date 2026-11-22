import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";

const LAMI_AVATAR = require("../assets/Cuaderno.jpg");

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
    desc: "Asumir que otras personas te juzgan o piensan mal sin pruebas.",
  },
  {
    id: "Todo o nada",
    icono: "⚖️",
    titulo: "Pensamiento Todo o Nada",
    desc: "Ver una situación como perfecta o como un fracaso total.",
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
    desc: "Sentir miedo intenso y asumir por eso que hay un peligro real.",
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
  // 1 = Registro (A-B-C) | 2 = Debate (D-E) | 3 = Balance | 4 = Historial
  const [etapa, setEtapa] = useState(1);

  // Parte 1: A - B - C
  const [eventoA, setEventoA] = useState("");
  const [creenciaB, setCreenciaB] = useState("");
  const [distorsion, setDistorsion] = useState(DISTORSIONES[0]);
  const [consecuenciaC, setConsecuenciaC] = useState("");
  const [intensidadInicial, setIntensidadInicial] = useState(7);

  // Parte 2: D - E
  const [debateEvidencia, setDebateEvidencia] = useState("");
  const [debateAmigo, setDebateAmigo] = useState("");
  const [efectoE, setEfectoE] = useState("");
  const [intensidadFinal, setIntensidadFinal] = useState(4);

  const [guardado, setGuardado] = useState(false);
  const [ultimoRegistroGuardado, setUltimoRegistroGuardado] = useState(null);
  const [modalGuardadoVisible, setModalGuardadoVisible] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // Modal con diseño para eliminar registro
  const [registroAEliminarId, setRegistroAEliminarId] = useState(null);
  const [eliminandoRegistro, setEliminandoRegistro] = useState(false);

  // Modal con diseño para avisos y campos incompletos
  const [avisoModal, setAvisoModal] = useState({
    visible: false,
    tag: "CAMPOS INCOMPLETOS",
    titulo: "",
    mensaje: "",
    etapaDestino: null,
  });

  const [historial, setHistorial] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const mostrarAvisoDisenado = (
    titulo,
    mensaje,
    tag = "CAMPOS INCOMPLETOS",
    etapaDestino = null,
  ) => {
    setAvisoModal({
      visible: true,
      tag,
      titulo,
      mensaje,
      etapaDestino,
    });
  };

  const cerrarAvisoDisenado = () => {
    const destino = avisoModal.etapaDestino;
    setAvisoModal((prev) => ({ ...prev, visible: false, etapaDestino: null }));
    if (destino) {
      setEtapa(destino);
    }
  };

  const obtenerStorageKey = () => {
    const uid = auth.currentUser?.uid || "invitado";
    return `historialABCDE_${uid}`;
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const key = obtenerStorageKey();
      const raw = await AsyncStorage.getItem(key);
      const lista = raw ? JSON.parse(raw) : [];
      setHistorial(lista);
    } catch (e) {
      console.log("Error cargando historial ABCDE:", e);
    }
  };

  const avanzarAIntervencion = () => {
    if (!eventoA.trim() || !creenciaB.trim() || !consecuenciaC.trim()) {
      mostrarAvisoDisenado(
        "Faltan datos en A - B - C",
        "Completa la situación (A), tu pensamiento automático (B) y la emoción o reacción física (C) para avanzar con calma al debate.",
        "CAMPOS INCOMPLETOS",
      );
      return;
    }
    setEtapa(2);
  };

  const avanzarAResultados = () => {
    if (!eventoA.trim() || !creenciaB.trim() || !consecuenciaC.trim()) {
      mostrarAvisoDisenado(
        "Primero completa A - B - C",
        "Te llevamos de vuelta al primer paso para que completes A, B y C antes de ver tu balance.",
        "CAMPOS INCOMPLETOS",
        1,
      );
      return;
    }

    if (!debateEvidencia.trim() || !efectoE.trim()) {
      mostrarAvisoDisenado(
        "Faltan datos en D - E",
        "Escribe tus pruebas en el Debate (D) y tu nuevo pensamiento equilibrado (E) para generar tu balance.",
        "CAMPOS INCOMPLETOS",
      );
      return;
    }
    setEtapa(3);
  };

  const calcularOrientacionPara = (inicial, final) => {
    const reduccion = inicial - final;

    if (reduccion >= 3) {
      return {
        nivel: "REESTRUCTURACIÓN COGNITIVA LOGRADA",
        color: "#0F766E",
        bgBadge: "#CCFBF1",
        icono: "checkmark-circle",
        resumen: `Tu malestar emocional disminuyó en ${reduccion} puntos (de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "Al contrastar con hechos reales tu pensamiento automático, disminuyó la señal de alerta y diste espacio a una respuesta más tranquila.",
        recomendacion:
          "Vuelve a leer tu pensamiento equilibrado (E) cada vez que reaparezca la situación detonante (A).",
      };
    }

    if (reduccion >= 1) {
      return {
        nivel: "REGULACIÓN COGNITIVA EN PROCESO",
        color: "#6D28D9",
        bgBadge: "#EDE9FE",
        icono: "sparkles",
        resumen: `Lograste bajar tu tensión en ${reduccion} punto${
          reduccion === 1 ? "" : "s"
        } (de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "En psicología cognitiva es normal que las creencias habituales cedan poco a poco. Identificar la trampa mental ya debilita su automatismo.",
        recomendacion:
          "Complementa este ejercicio con 2 minutos de respiración pausada para ayudar a que tu cuerpo suelte la tensión restante.",
      };
    }

    return {
      nivel: "ACTIVACIÓN EMOCIONAL ELEVADA",
      color: "#B45309",
      bgBadge: "#FEF3C7",
      icono: "information-circle",
      resumen: `Tu nivel de tensión se mantuvo en ${final}/10.`,
      explicacion:
        "Cuando la activación física es muy alta, resulta más difícil procesar argumentos racionales en el primer intento.",
      recomendacion:
        "Haz primero una pausa breve de respiración o escaneo corporal junto a Lami y retoma el debate cuando te sientas un poco más estable.",
    };
  };

  const guardarHistorial = async () => {
    try {
      const key = obtenerStorageKey();
      const raw = await AsyncStorage.getItem(key);
      const lista = raw ? JSON.parse(raw) : [];
      const interp = calcularOrientacionPara(
        intensidadInicial,
        intensidadFinal,
      );

      const nuevoRegistro = {
        id: Date.now().toString(),
        uid: auth.currentUser?.uid || "invitado",
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
      await AsyncStorage.setItem(key, JSON.stringify(nuevaLista));
      setHistorial(nuevaLista);
      setUltimoRegistroGuardado(nuevoRegistro);
      setGuardado(true);
      setModalGuardadoVisible(true);
    } catch (e) {
      console.log("Error guardando ABCDE:", e);
      mostrarAvisoDisenado(
        "No se pudo guardar",
        "Ocurrió un inconveniente al guardar tu autorregistro. Intenta nuevamente.",
        "AVISO",
      );
    }
  };

  const solicitarEliminarRegistro = (id) => {
    setRegistroAEliminarId(id);
  };

  const cancelarEliminarRegistro = () => {
    if (eliminandoRegistro) return;
    setRegistroAEliminarId(null);
  };

  const confirmarEliminarRegistro = async () => {
    if (!registroAEliminarId || eliminandoRegistro) return;

    try {
      setEliminandoRegistro(true);
      const key = obtenerStorageKey();
      const filtrados = historial.filter(
        (item) => item.id !== registroAEliminarId,
      );
      await AsyncStorage.setItem(key, JSON.stringify(filtrados));
      setHistorial(filtrados);
      if (expandedId === registroAEliminarId) {
        setExpandedId(null);
      }
      setRegistroAEliminarId(null);
    } catch (e) {
      console.log("Error eliminando registro:", e);
      mostrarAvisoDisenado(
        "No se pudo eliminar",
        "Ocurrió un inconveniente al borrar el registro. Intenta nuevamente.",
        "AVISO",
      );
    } finally {
      setEliminandoRegistro(false);
    }
  };

  const construirHtmlPdf = (registrosAExportar, tituloReporte) => {
    const bloquesHtml = registrosAExportar
      .map((item, idx) => {
        const interp = calcularOrientacionPara(
          item.intensidadInicial,
          item.intensidadFinal,
        );
        return `
          <div style="border: 1px solid #B3D3DA; border-radius: 14px; padding: 18px; margin-bottom: 20px; background-color: #FFFFFF; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #EAF4F7; padding-bottom: 10px; margin-bottom: 12px;">
              <div>
                <span style="font-size: 11px; color: #617D8A; font-weight: bold;">REGISTRO #${
                  registrosAExportar.length - idx
                } • ${escapeHtml(formatearFecha(item.fecha))}</span>
                <h3 style="margin: 4px 0 0 0; color: #1E3A4C; font-size: 15px;">${escapeHtml(
                  interp.nivel,
                )}</h3>
              </div>
              <div style="background-color: #EAE8FC; padding: 8px 12px; border-radius: 10px; text-align: center;">
                <span style="font-size: 10px; color: #3F3B7A; display: block;">Malestar (C → E)</span>
                <strong style="font-size: 15px; color: #1E3A4C;">${
                  item.intensidadInicial
                }/10 ➔ ${item.intensidadFinal}/10</strong>
              </div>
            </div>

            <div style="background-color: #F4F7FA; border: 1px solid #D6E8EE; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
              <h4 style="margin: 0 0 8px 0; color: #1E3A4C; font-size: 12px; text-transform: uppercase;">I. Registro Inicial (A - B - C)</h4>
              <p style="margin: 4px 0; font-size: 13px;"><strong>• A (Acontecimiento):</strong> ${escapeHtml(
                item.eventoA,
              )}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>• B (Pensamiento Automático):</strong> <span style="text-decoration: line-through; color: #991B1B;">"${escapeHtml(
                item.creenciaB,
              )}"</span></p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>• Distorsión Cognitiva:</strong> ${escapeHtml(
                item.distorsion,
              )}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>• C (Consecuencia Emocional/Física):</strong> ${escapeHtml(
                item.consecuenciaC,
              )} <em>(Intensidad inicial: ${item.intensidadInicial}/10)</em></p>
            </div>

            <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
              <h4 style="margin: 0 0 8px 0; color: #047857; font-size: 12px; text-transform: uppercase;">II. Debate y Reestructuración (D - E)</h4>
              <p style="margin: 4px 0; font-size: 13px;"><strong>• D (Debate / Evidencia Racional):</strong> ${escapeHtml(
                item.debateEvidencia,
              )}</p>
              ${
                item.debateAmigo && item.debateAmigo.trim()
                  ? `<p style="margin: 4px 0; font-size: 13px;"><strong>• D (Perspectiva Compasiva):</strong> ${escapeHtml(
                      item.debateAmigo,
                    )}</p>`
                  : ""
              }
              <p style="margin: 4px 0; font-size: 13px;"><strong>• E (Nuevo Pensamiento Equilibrado):</strong> <strong style="color: #065F46;">"${escapeHtml(
                item.efectoE,
              )}"</strong> <em>(Intensidad final: ${
                item.intensidadFinal
              }/10)</em></p>
            </div>

            <div style="background-color: #F5F3FF; border-radius: 10px; padding: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #3F3B7A;"><strong>Orientación de Bienestar:</strong> ${escapeHtml(
                interp.resumen,
              )} ${escapeHtml(interp.explicacion)}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #374151;"><strong>Sugerencia:</strong> ${escapeHtml(
                interp.recomendacion,
              )}</p>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #1E3A4C; background-color: #F4F7FA;">
          <div style="text-align: center; margin-bottom: 22px; border-bottom: 2px solid #B3D3DA; padding-bottom: 14px;">
            <span style="background-color: #EAE8FC; color: #3F3B7A; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: bold;">
              LAMI • MODELO ABCDE (ALBERT ELLIS, TREC)
            </span>
            <h1 style="color: #1E3A4C; margin: 8px 0 4px 0; font-size: 22px;">${escapeHtml(
              tituloReporte,
            )}</h1>
            <p style="color: #617D8A; font-size: 12px; margin: 0;">
              Generado el ${new Date().toLocaleDateString("es-MX")} • Registros: ${
                registrosAExportar.length
              }
            </p>
          </div>

          ${bloquesHtml}

          <p style="font-size: 11px; color: #617D8A; text-align: center; margin-top: 14px;">
            Basado en el modelo ABCDE de la Terapia Racional Emotivo-Conductual (Albert Ellis, 1962). Adaptación original de uso libre con fines educativos y de autocuidado; no sustituye valoración ni tratamiento psicológico o médico.
          </p>
        </body>
      </html>
    `;
  };

  const exportarAPDF = async (
    registrosAExportar,
    tituloReporte = "Autorregistro Cognitivo ABCDE",
  ) => {
    if (exportandoPDF) return;
    if (!registrosAExportar || registrosAExportar.length === 0) {
      mostrarAvisoDisenado(
        "Sin registros para exportar",
        "Aún no hay ejercicios guardados en el historial para generar un PDF.",
        "AVISO",
      );
      return;
    }

    try {
      setExportandoPDF(true);
      const html = construirHtmlPdf(registrosAExportar, tituloReporte);
      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            UTI: "com.adobe.pdf",
            mimeType: "application/pdf",
            dialogTitle: "Exportar Autorregistro ABCDE (PDF)",
          });
        } else {
          await Print.printAsync({ html });
        }
      } catch (shareErr) {
        console.warn("Respaldo de impresión/PDF:", shareErr);
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.log("Error exportando PDF ABCDE:", e);
      mostrarAvisoDisenado(
        "Error al generar el PDF",
        e?.message || "No se pudo crear el archivo PDF en este momento.",
        "AVISO",
      );
    } finally {
      setExportandoPDF(false);
    }
  };

  const exportarActualAPDF = () => {
    const registroActual = ultimoRegistroGuardado || {
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
    exportarAPDF([registroActual], "Autorregistro Cognitivo ABCDE");
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
    setUltimoRegistroGuardado(null);
    setModalGuardadoVisible(false);
    setEtapa(1);
  };

  const interpretacion = calcularOrientacionPara(
    intensidadInicial,
    intensidadFinal,
  );

  return (
    <LinearGradient
      colors={["#EAF4F7", "#F4F7FA", "#EAE8FC"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E3A4C" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBadge}>
              TREC • MODELO DE ALBERT ELLIS
            </Text>
            <Text style={styles.headerTitle}>Técnica ABCDE</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.historyHeaderBtn,
              etapa === 4 && styles.historyHeaderBtnActive,
            ]}
            onPress={() => setEtapa(4)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="folder-open-outline"
              size={15}
              color={etapa === 4 ? "#FFF" : "#3F3B7A"}
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

        {/* STEPPER */}
        <View style={styles.stepperContainer}>
          {[
            { num: 1, label: "1. A-B-C" },
            { num: 2, label: "2. D-E" },
            { num: 3, label: "3. Balance" },
            { num: 4, label: "4. Guardados" },
          ].map((step) => {
            const activo = etapa === step.num;
            return (
              <TouchableOpacity
                key={step.num}
                style={[styles.stepPill, activo && styles.stepPillActive]}
                onPress={() => {
                  if (step.num === 1 || step.num === 4) setEtapa(step.num);
                  else if (step.num === 2) {
                    if (etapa === 2 || etapa === 3) setEtapa(2);
                    else avanzarAIntervencion();
                  } else if (step.num === 3) {
                    if (etapa === 3) setEtapa(3);
                    else if (etapa === 2) avanzarAResultados();
                    else avanzarAIntervencion();
                  }
                }}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    activo && styles.stepPillTextActive,
                  ]}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= ETAPA 1: A - B - C ================= */}
          {etapa === 1 && (
            <>
              <View style={styles.introCard}>
                <Image
                  source={LAMI_AVATAR}
                  style={styles.lamiIntroImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.introTitle}>
                    Paso 1: Observa tu pensamiento (A-B-C)
                  </Text>
                  <Text style={styles.introText}>
                    Según el psicólogo Albert Ellis, nuestro malestar no nace
                    solo de lo que pasa (A), sino de cómo lo interpretamos (B).
                    Exploremos juntos qué está ocurriendo.
                  </Text>
                </View>
              </View>

              {/* PASO A */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#E0F2FE" }]}
                  >
                    <Text style={[styles.letterText, { color: "#0369A1" }]}>
                      A
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Acontecimiento Activador
                    </Text>
                    <Text style={styles.cardSub}>
                      ¿Qué hecho ocurrió o qué situación te preocupa?
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: Mañana tengo una presentación o siento muchos pendientes..."
                  placeholderTextColor="#94A3B8"
                  value={eventoA}
                  onChangeText={setEventoA}
                />
              </View>

              {/* PASO B */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#FEE2E2" }]}
                  >
                    <Text style={[styles.letterText, { color: "#B91C1C" }]}>
                      B
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Creencia o Pensamiento Automático
                    </Text>
                    <Text style={styles.cardSub}>
                      ¿Qué te dices a ti mismo/a sobre esa situación?
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: 'Me voy a bloquear, todos lo notarán y saldrá mal'..."
                  placeholderTextColor="#94A3B8"
                  value={creenciaB}
                  onChangeText={setCreenciaB}
                />

                <Text style={styles.subLabel}>
                  Identifica qué trampa mental se parece más a ese pensamiento:
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
                      activeOpacity={0.85}
                    >
                      <Text style={styles.distortionIcon}>{item.icono}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.distortionTitle,
                            activo && { color: "#3F3B7A" },
                          ]}
                        >
                          {item.titulo}
                        </Text>
                        <Text style={styles.distortionDesc}>{item.desc}</Text>
                      </View>
                      <Ionicons
                        name={activo ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={activo ? "#7E83C2" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* PASO C */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#FEF3C7" }]}
                  >
                    <Text style={[styles.letterText, { color: "#B45309" }]}>
                      C
                    </Text>
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
                  placeholder="Ej: Angustia, presión en el pecho, tensión en hombros..."
                  placeholderTextColor="#94A3B8"
                  value={consecuenciaC}
                  onChangeText={setConsecuenciaC}
                />

                <Text style={styles.subLabel}>
                  Intensidad de tu malestar ahora (1 al 10):
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
                onPress={avanzarAIntervencion}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    Continuar al Debate (D - E) →
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ================= ETAPA 2: D - E ================= */}
          {etapa === 2 && (
            <>
              <View style={styles.introCard}>
                <Image
                  source={LAMI_AVATAR}
                  style={styles.lamiIntroImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.introTitle}>
                    Paso 2: Debate y Nueva Perspectiva (D-E)
                  </Text>
                  <Text style={styles.introText}>
                    Cuestionemos con calma tu pensamiento automático (D) para
                    construir una respuesta más realista y amable (E).
                  </Text>
                </View>
              </View>

              <View style={styles.quoteBox}>
                <Text style={styles.quoteLabel}>
                  Pensamiento a revisar ({distorsion.icono} {distorsion.titulo}
                  ):
                </Text>
                <Text style={styles.quoteText}>"{creenciaB}"</Text>
              </View>

              {/* PASO D */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#EAE8FC" }]}
                  >
                    <Text style={[styles.letterText, { color: "#3F3B7A" }]}>
                      D
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Debate / Disputa Racional
                    </Text>
                    <Text style={styles.cardSub}>
                      Pon a prueba el pensamiento con hechos objetivos.
                    </Text>
                  </View>
                </View>

                <Text style={styles.fieldQuestion}>
                  1. Evidencia real: ¿Qué pruebas concretas tienes de que
                  ocurrirá lo peor, o qué veces anteriores lograste manejar algo
                  parecido?
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: En otras ocasiones sentí nervios al inicio, pero me preparé y logré terminar bien..."
                  placeholderTextColor="#94A3B8"
                  value={debateEvidencia}
                  onChangeText={setDebateEvidencia}
                />

                <Text style={[styles.fieldQuestion, { marginTop: 12 }]}>
                  2. Mirada compasiva: Si alguien a quien aprecias tuviera este
                  mismo pensamiento, ¿qué le dirías?
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: Le diría que sentir nervios es normal y que no necesita hacerlo perfecto..."
                  placeholderTextColor="#94A3B8"
                  value={debateAmigo}
                  onChangeText={setDebateAmigo}
                />
              </View>

              {/* PASO E */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#CCFBF1" }]}
                  >
                    <Text style={[styles.letterText, { color: "#0F766E" }]}>
                      E
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Efecto y Pensamiento Equilibrado
                    </Text>
                    <Text style={styles.cardSub}>
                      Escribe tu nueva conclusión funcional y mide cómo cambió
                      tu tensión.
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="Ej: 'Es normal sentir inquietud, pero estoy preparado/a y puedo ir paso a paso'..."
                  placeholderTextColor="#94A3B8"
                  value={efectoE}
                  onChangeText={setEfectoE}
                />

                <Text style={styles.subLabel}>
                  Nivel de malestar después del debate (1 al 10) (Antes:{" "}
                  {intensidadInicial}/10):
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
                  <Text style={styles.secondaryBtnText}>← A-B-C</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={avanzarAResultados}
                  activeOpacity={0.9}
                  style={{ flex: 1.4 }}
                >
                  <LinearGradient
                    colors={["#6192A4", "#7E83C2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.primaryBtn, { marginTop: 0 }]}
                  >
                    <Text style={styles.primaryBtnText}>
                      Ver Balance Final →
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ================= ETAPA 3: BALANCE Y RESUMEN ================= */}
          {etapa === 3 && (
            <>
              {guardado && (
                <View style={styles.savedBannerCard}>
                  <View style={styles.savedBannerRow}>
                    <View style={styles.savedIconCircle}>
                      <Ionicons
                        name="checkmark-done"
                        size={20}
                        color="#0F766E"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedBannerTitle}>
                        Autorregistro guardado
                      </Text>
                      <Text style={styles.savedBannerSub}>
                        Ya forma parte de tu historial y está listo para
                        exportar en PDF.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.savedBannerActions}>
                    <TouchableOpacity
                      style={styles.savedBannerPdfBtn}
                      onPress={exportarActualAPDF}
                      disabled={exportandoPDF}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.savedBannerPdfText}>
                        {exportandoPDF ? "Generando..." : "Exportar PDF"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.savedBannerHistoryBtn}
                      onPress={() => {
                        if (ultimoRegistroGuardado?.id) {
                          setExpandedId(ultimoRegistroGuardado.id);
                        }
                        setEtapa(4);
                      }}
                    >
                      <Text style={styles.savedBannerHistoryText}>
                        Ver historial
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.resultCard}>
                <View style={styles.resultTopRow}>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.resultBadge,
                        { backgroundColor: interpretacion.bgBadge },
                      ]}
                    >
                      <Ionicons
                        name={interpretacion.icono}
                        size={15}
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
                      Balance de tu ejercicio
                    </Text>
                  </View>

                  <Image
                    source={LAMI_AVATAR}
                    style={styles.lamiResultImg}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.metricsBox}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Malestar Inicial (C)</Text>
                    <Text style={[styles.metricValue, { color: "#DC2626" }]}>
                      {intensidadInicial}/10
                    </Text>
                  </View>

                  <Ionicons name="arrow-forward" size={24} color="#6192A4" />

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
                    Orientación psicológica (TREC):
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.explicacion}
                  </Text>
                  <Text style={[styles.clinicalTitle, { marginTop: 10 }]}>
                    Sugerencia práctica:
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.recomendacion}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.summaryHeaderTitle}>
                  Resumen de tu Autorregistro ABCDE
                </Text>

                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryTag}>
                    I. Registro Inicial (A - B - C)
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
                    II. Debate y Nueva Respuesta (D - E)
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>• D (Evidencia racional): </Text>
                    {debateEvidencia}
                  </Text>
                  {debateAmigo.trim() ? (
                    <Text style={styles.summaryLine}>
                      <Text style={styles.bold}>• D (Mirada compasiva): </Text>
                      {debateAmigo}
                    </Text>
                  ) : null}
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>
                      • E (Pensamiento equilibrado):{" "}
                    </Text>
                    <Text style={{ color: "#065F46", fontWeight: "700" }}>
                      "{efectoE}"
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.footerBtns}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    guardado && { backgroundColor: "#0F766E" },
                  ]}
                  onPress={guardarHistorial}
                  disabled={guardado}
                >
                  <Text style={styles.saveBtnText}>
                    {guardado
                      ? "Autorregistro guardado ✓"
                      : "Guardar autorregistro"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={exportarActualAPDF}
                  disabled={exportandoPDF}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.pdfBtnText}>
                    {exportandoPDF
                      ? "Preparando PDF..."
                      : "Exportar este registro a PDF"}
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
                      { backgroundColor: "#EAE8FC", borderColor: "#CEC7FD" },
                    ]}
                    onPress={() => setEtapa(4)}
                  >
                    <Text
                      style={[styles.secondaryBtnText, { color: "#3F3B7A" }]}
                    >
                      Ver Historial
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ================= ETAPA 4: HISTORIAL ================= */}
          {etapa === 4 && (
            <>
              <View style={styles.introCard}>
                <Image
                  source={LAMI_AVATAR}
                  style={styles.lamiIntroImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.introTitle}>
                    Historial de Autorregistros ABCDE
                  </Text>
                  <Text style={styles.introText}>
                    Revisa tus ejercicios guardados o expórtalos en PDF para tu
                    seguimiento personal.
                  </Text>
                </View>
              </View>

              {historial.length > 0 && (
                <TouchableOpacity
                  style={[styles.pdfBtn, { marginBottom: 14 }]}
                  disabled={exportandoPDF}
                  onPress={() =>
                    exportarAPDF(
                      historial,
                      "Historial Completo de Autorregistros ABCDE",
                    )
                  }
                >
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.pdfBtnText}>
                    {exportandoPDF
                      ? "Generando PDF..."
                      : `Exportar todo el historial a PDF (${historial.length})`}
                  </Text>
                </TouchableOpacity>
              )}

              {historial.length === 0 ? (
                <View
                  style={[
                    styles.card,
                    { alignItems: "center", paddingVertical: 28 },
                  ]}
                >
                  <Image
                    source={LAMI_AVATAR}
                    style={{ width: 72, height: 72, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: "#1E3A4C",
                    }}
                  >
                    Aún no tienes registros guardados
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#617D8A",
                      textAlign: "center",
                      marginTop: 4,
                      marginBottom: 16,
                    }}
                  >
                    Completa los pasos A-B-C y D-E y guarda tu autorregistro
                    para consultarlo aquí.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEtapa(1)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={["#6192A4", "#7E83C2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.primaryBtn, { paddingHorizontal: 24 }]}
                    >
                      <Text style={styles.primaryBtnText}>
                        Iniciar ejercicio ABCDE
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                historial.map((item, index) => {
                  const abierto = expandedId === item.id;
                  const interp = calcularOrientacionPara(
                    item.intensidadInicial,
                    item.intensidadFinal,
                  );

                  return (
                    <View key={item.id} style={styles.card}>
                      <TouchableOpacity
                        style={styles.historyItemHeader}
                        onPress={() => setExpandedId(abierto ? null : item.id)}
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
                          color="#617D8A"
                        />
                      </TouchableOpacity>

                      {abierto && (
                        <View style={{ marginTop: 14 }}>
                          <View style={styles.summaryBlock}>
                            <Text style={styles.summaryTag}>
                              I. Registro Inicial (A - B - C)
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
                              II. Debate y Nueva Respuesta (D - E)
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>• D (Evidencia): </Text>
                              {item.debateEvidencia}
                            </Text>
                            {item.debateAmigo ? (
                              <Text style={styles.summaryLine}>
                                <Text style={styles.bold}>
                                  • D (Mirada compasiva):{" "}
                                </Text>
                                {item.debateAmigo}
                              </Text>
                            ) : null}
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>
                                • E (Pensamiento equilibrado):{" "}
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
                              Orientación:
                            </Text>
                            <Text style={styles.clinicalBody}>
                              {interp.resumen} {interp.explicacion}
                            </Text>
                          </View>

                          <View style={[styles.rowBtns, { marginTop: 12 }]}>
                            <TouchableOpacity
                              style={[styles.pdfSingleBtn, { flex: 1 }]}
                              disabled={exportandoPDF}
                              onPress={() =>
                                exportarAPDF(
                                  [item],
                                  `Autorregistro ABCDE - ${formatearFecha(
                                    item.fecha,
                                  )}`,
                                )
                              }
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={16}
                                color="#3F3B7A"
                              />
                              <Text style={styles.pdfSingleBtnText}>
                                Exportar este PDF
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => solicitarEliminarRegistro(item.id)}
                              activeOpacity={0.85}
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

          {/* REFERENCIA PSICOLÓGICA Y AVISO DE USO LIBRE */}
          <View style={styles.referenceFooter}>
            <Text style={styles.referenceTitle}>
              Respaldo psicológico y atribución
            </Text>
            <Text style={styles.referenceText}>
              Basado en el modelo ABCDE de la Terapia Racional
              Emotivo-Conductual (TREC / REBT) propuesto por el psicólogo Albert
              Ellis (obras de referencia: "Reason and Emotion in Psychotherapy",
              1962; "A Guide to Rational Living", Ellis & Harper, 1975).
            </Text>
            <Text style={styles.referenceDisclaimer}>
              Redacción original e interfaz creada para Lami como herramienta
              abierta y libre de copyright con fines educativos y de
              autocuidado. No sustituye diagnóstico ni atención psicológica o
              médica profesional.
            </Text>
          </View>
        </ScrollView>

        {/* MODAL ESTILIZADO PARA CAMPOS INCOMPLETOS / AVISOS */}
        <Modal
          visible={avisoModal.visible}
          transparent
          animationType="fade"
          onRequestClose={cerrarAvisoDisenado}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.warningModalCard}>
              <View style={styles.warningBadge}>
                <Ionicons name="sparkles" size={15} color="#3F3B7A" />
                <Text style={styles.warningBadgeText}>{avisoModal.tag}</Text>
              </View>

              <Image
                source={LAMI_AVATAR}
                style={styles.modalLamiImg}
                resizeMode="contain"
              />

              <Text style={styles.warningModalTitle}>{avisoModal.titulo}</Text>
              <Text style={styles.warningModalDesc}>{avisoModal.mensaje}</Text>

              <TouchableOpacity
                onPress={cerrarAvisoDisenado}
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 14 }}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPdfPrimaryBtn}
                >
                  <Text style={styles.modalPdfPrimaryText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL LINDO AL GUARDAR EL AUTORREGISTRO */}
        <Modal
          visible={modalGuardadoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalGuardadoVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.savedModalCard}>
              <View style={styles.savedModalBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
                <Text style={styles.savedModalBadgeText}>LAMI • GUARDADO</Text>
              </View>

              <Image
                source={LAMI_AVATAR}
                style={styles.modalLamiImg}
                resizeMode="contain"
              />

              <Text style={styles.savedModalTitle}>Autorregistro guardado</Text>
              <Text style={styles.savedModalDesc}>
                Tu reflexión ABCDE quedó guardada en tu historial con un cambio
                de malestar de{" "}
                <Text style={{ fontWeight: "800", color: "#1E3A4C" }}>
                  {intensidadInicial}/10 a {intensidadFinal}/10
                </Text>
                .
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setModalGuardadoVisible(false);
                  exportarActualAPDF();
                }}
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 12 }}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPdfPrimaryBtn}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPdfPrimaryText}>
                    Exportar PDF ahora
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setModalGuardadoVisible(false);
                  if (ultimoRegistroGuardado?.id) {
                    setExpandedId(ultimoRegistroGuardado.id);
                  }
                  setEtapa(4);
                }}
              >
                <Text style={styles.modalSecondaryText}>Ver en Historial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseLink}
                onPress={() => setModalGuardadoVisible(false)}
              >
                <Text style={styles.modalCloseLinkText}>Seguir aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL ESTILIZADO PARA CONFIRMAR ELIMINAR REGISTRO */}
        <Modal
          visible={Boolean(registroAEliminarId)}
          transparent
          animationType="fade"
          onRequestClose={cancelarEliminarRegistro}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteModalBadge}>
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                <Text style={styles.deleteModalBadgeText}>
                  ELIMINAR REGISTRO
                </Text>
              </View>

              <Image
                source={LAMI_AVATAR}
                style={styles.modalLamiImg}
                resizeMode="contain"
              />

              <Text style={styles.deleteModalTitle}>
                ¿Eliminar este autorregistro?
              </Text>
              <Text style={styles.deleteModalDesc}>
                Esta acción borrará el registro seleccionado de tu historial y
                no se podrá deshacer.
              </Text>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={cancelarEliminarRegistro}
                  disabled={eliminandoRegistro}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={confirmarEliminarRegistro}
                  disabled={eliminandoRegistro}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteConfirmText}>
                    {eliminandoRegistro ? "Eliminando..." : "Sí, eliminar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    borderWidth: 1,
    borderColor: "#B3D3DA",
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  historyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAE8FC",
    borderWidth: 1,
    borderColor: "#CEC7FD",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  historyHeaderBtnActive: {
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
  },
  historyHeaderBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3F3B7A",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    alignItems: "center",
  },
  stepPillActive: {
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#476475",
  },
  stepPillTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
  },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#B3D3DA",
  },
  lamiIntroImg: {
    width: 64,
    height: 64,
  },
  introTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 3,
  },
  introText: {
    fontSize: 12.5,
    color: "#476475",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D6E8EE",
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
    color: "#1E3A4C",
  },
  cardSub: {
    fontSize: 12,
    color: "#617D8A",
    marginTop: 2,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    borderRadius: 14,
    padding: 12,
    minHeight: 74,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#1E3A4C",
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C4959",
    marginTop: 14,
    marginBottom: 8,
  },
  distortionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2EEF2",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  distortionItemActive: {
    backgroundColor: "#EAE8FC",
    borderColor: "#7E83C2",
  },
  distortionIcon: {
    fontSize: 21,
  },
  distortionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A4C",
  },
  distortionDesc: {
    fontSize: 11,
    color: "#617D8A",
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  scaleBtn: {
    width: 29,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0F7F9",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    justifyContent: "center",
    alignItems: "center",
  },
  scaleBtnActiveRed: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  scaleBtnActiveGreen: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  scaleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A4C",
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
    color: "#2C4959",
    marginBottom: 6,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
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
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E3A4C",
  },
  savedBannerCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#99F6E4",
    borderRadius: 22,
    padding: 15,
    marginBottom: 14,
  },
  savedBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  savedIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  savedBannerTitle: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#0F3D42",
  },
  savedBannerSub: {
    fontSize: 12,
    color: "#2C4959",
    lineHeight: 17,
    marginTop: 2,
  },
  savedBannerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  savedBannerPdfBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0F766E",
    paddingVertical: 10,
    borderRadius: 999,
  },
  savedBannerPdfText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  savedBannerHistoryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#99F6E4",
    paddingVertical: 10,
    borderRadius: 999,
  },
  savedBannerHistoryText: {
    color: "#0F766E",
    fontSize: 12.5,
    fontWeight: "800",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#B3D3DA",
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  lamiResultImg: {
    width: 62,
    height: 62,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
    marginBottom: 6,
  },
  resultBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  resultMainTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F4F7FA",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: "#617D8A",
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
    color: "#1E3A4C",
    marginBottom: 12,
    lineHeight: 20,
  },
  clinicalBox: {
    backgroundColor: "#EAE8FC",
    borderRadius: 16,
    padding: 14,
  },
  clinicalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3F3B7A",
    marginBottom: 4,
  },
  clinicalBody: {
    fontSize: 13,
    color: "#2C4959",
    lineHeight: 19,
  },
  summaryHeaderTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 12,
  },
  summaryBlock: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  summaryTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryLine: {
    fontSize: 13,
    color: "#2C4959",
    marginBottom: 6,
    lineHeight: 19,
  },
  bold: {
    fontWeight: "700",
    color: "#1E3A4C",
  },
  strikeText: {
    textDecorationLine: "line-through",
    color: "#991B1B",
  },
  footerBtns: {
    gap: 8,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: "#0F766E",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
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
    backgroundColor: "#7E83C2",
    paddingVertical: 14,
    borderRadius: 999,
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
    color: "#617D8A",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A4C",
    marginTop: 2,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  historyBadgeBox: {
    backgroundColor: "#EAE8FC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  historyScoreLabel: {
    fontSize: 10,
    color: "#3F3B7A",
    fontWeight: "700",
  },
  historyScoreValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  pdfSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EAE8FC",
    paddingVertical: 11,
    borderRadius: 12,
  },
  pdfSingleBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3F3B7A",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    padding: 11,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  referenceFooter: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E8EE",
  },
  referenceTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 11,
    color: "#476475",
    lineHeight: 16,
    marginBottom: 6,
  },
  referenceDisclaimer: {
    fontSize: 10.5,
    color: "#617D8A",
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  warningModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CEC7FD",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAE8FC",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  warningBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#3F3B7A",
    letterSpacing: 0.4,
  },
  warningModalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A4C",
    marginTop: 6,
    textAlign: "center",
  },
  warningModalDesc: {
    fontSize: 13,
    color: "#476475",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  savedModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B3D3DA",
  },
  savedModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  savedModalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F766E",
  },
  modalLamiImg: {
    width: 78,
    height: 78,
    marginTop: 10,
  },
  savedModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E3A4C",
    marginTop: 6,
  },
  savedModalDesc: {
    fontSize: 13,
    color: "#476475",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  modalPdfPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
  },
  modalPdfPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalSecondaryBtn: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#F0F7F9",
    alignItems: "center",
  },
  modalSecondaryText: {
    color: "#1E3A4C",
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalCloseLink: {
    marginTop: 10,
    paddingVertical: 4,
  },
  modalCloseLinkText: {
    color: "#617D8A",
    fontSize: 12.5,
    fontWeight: "600",
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deleteModalBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.4,
  },
  deleteModalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A4C",
    marginTop: 6,
    textAlign: "center",
  },
  deleteModalDesc: {
    fontSize: 13,
    color: "#476475",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 16,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#F0F7F9",
    alignItems: "center",
  },
  deleteCancelText: {
    color: "#1E3A4C",
    fontSize: 13.5,
    fontWeight: "700",
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
