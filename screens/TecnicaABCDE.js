import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
<<<<<<< HEAD
  Alert,
  ScrollView,
=======
  Image,
  Modal,
  ScrollView,
  StatusBar,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";

<<<<<<< HEAD
=======
const LAMI_AVATAR = require("../assets/lami_1.png");

>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    desc: "Asumir que otros me juzgan o piensan mal sin pruebas.",
=======
    desc: "Asumir que otras personas te juzgan o piensan mal sin pruebas.",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  {
    id: "Todo o nada",
    icono: "⚖️",
    titulo: "Pensamiento Todo o Nada",
<<<<<<< HEAD
    desc: "Ver las cosas como perfectas o como un fracaso total.",
=======
    desc: "Ver una situación como perfecta o como un fracaso total.",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    desc: "Sentir miedo intenso y asumir por eso que hay peligro real.",
=======
    desc: "Sentir miedo intenso y asumir por eso que hay un peligro real.",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
  // 1 = Diagnóstico (A-B-C) | 2 = Intervención (D-E) | 3 = Interpretación y Resumen | 4 = Tests Anteriores
  const [etapa, setEtapa] = useState(1);

  // Parte 1: Diagnóstico (A - B - C)
=======
  // 1 = Registro (A-B-C) | 2 = Debate (D-E) | 3 = Balance | 4 = Historial
  const [etapa, setEtapa] = useState(1);

  // Parte 1: A - B - C
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  const [eventoA, setEventoA] = useState("");
  const [creenciaB, setCreenciaB] = useState("");
  const [distorsion, setDistorsion] = useState(DISTORSIONES[0]);
  const [consecuenciaC, setConsecuenciaC] = useState("");
  const [intensidadInicial, setIntensidadInicial] = useState(7);

<<<<<<< HEAD
  // Parte 2: Intervención (D - E)
=======
  // Parte 2: D - E
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  const [debateEvidencia, setDebateEvidencia] = useState("");
  const [debateAmigo, setDebateAmigo] = useState("");
  const [efectoE, setEfectoE] = useState("");
  const [intensidadFinal, setIntensidadFinal] = useState(4);

  const [guardado, setGuardado] = useState(false);
<<<<<<< HEAD
  const [historial, setHistorial] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Clave única en AsyncStorage por usuario logueado
=======
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

>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
      Alert.alert(
        "Campos incompletos",
        "Por favor completa los pasos A, B y C para realizar un diagnóstico preciso"
=======
      mostrarAvisoDisenado(
        "Faltan datos en A - B - C",
        "Completa la situación (A), tu pensamiento automático (B) y la emoción o reacción física (C) para avanzar con calma al debate.",
        "CAMPOS INCOMPLETOS",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
      );
      return;
    }
    setEtapa(2);
  };

  const avanzarAResultados = () => {
<<<<<<< HEAD
    if (!debateEvidencia.trim() || !efectoE.trim()) {
      Alert.alert(
        "Completa la intervención",
        "Por favor escribe las pruebas en el Debate (D) y tu nuevo pensamiento funcional (E)"
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
      );
      return;
    }
    setEtapa(3);
  };

<<<<<<< HEAD
  const calcularInterpretacionPara = (inicial, final) => {
=======
  const calcularOrientacionPara = (inicial, final) => {
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    const reduccion = inicial - final;

    if (reduccion >= 3) {
      return {
<<<<<<< HEAD
        nivel: "REESTRUCTURACIÓN COGNITIVA EXITOSA",
        color: "#059669",
        bgBadge: "#D1FAE5",
        icono: "checkmark-circle",
        resumen: `Tu malestar emocional disminuyó significativamente en ${reduccion} puntos (pasó de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "Al cuestionar con evidencia real tu pensamiento automático, desactivaste la alarma de amenaza en tu sistema nervioso, permitiendo que la emoción se regule desde la razón.",
        recomendacion:
          "Lee en voz alta tu nuevo pensamiento funcional (E) cada vez que vuelva a aparecer la situación detonante (A).",
=======
        nivel: "REESTRUCTURACIÓN COGNITIVA LOGRADA",
        color: "#0F766E",
        bgBadge: "#CCFBF1",
        icono: "checkmark-circle",
        resumen: `Tu malestar emocional disminuyó en ${reduccion} puntos (de ${inicial}/10 a ${final}/10).`,
        explicacion:
          "Al contrastar con hechos reales tu pensamiento automático, disminuyó la señal de alerta y diste espacio a una respuesta más tranquila.",
        recomendacion:
          "Vuelve a leer tu pensamiento equilibrado (E) cada vez que reaparezca la situación detonante (A).",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
      };
    }

    if (reduccion >= 1) {
      return {
        nivel: "REGULACIÓN COGNITIVA EN PROCESO",
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
      };
    }

    return {
<<<<<<< HEAD
      nivel: "ALTA ACTIVACIÓN FISIOLÓGICA",
      color: "#D97706",
      bgBadge: "#FEF3C7",
      icono: "information-circle",
      resumen: `Tu intensidad emocional se mantuvo elevada (${final}/10).`,
      explicacion:
        "La literatura clínica explica que cuando la amígdala cerebral está muy activada, el malestar físico dificulta asimilar argumentos racionales en el primer intento.",
      recomendacion:
        "Antes de volver a debatir el pensamiento, realiza un ejercicio somático (como Respiración 4-7-8 o Anclaje con los sentidos) para bajar primero la tensión corporal.",
=======
      nivel: "ACTIVACIÓN EMOCIONAL ELEVADA",
      color: "#B45309",
      bgBadge: "#FEF3C7",
      icono: "information-circle",
      resumen: `Tu nivel de tensión se mantuvo en ${final}/10.`,
      explicacion:
        "Cuando la activación física es muy alta, resulta más difícil procesar argumentos racionales en el primer intento.",
      recomendacion:
        "Haz primero una pausa breve de respiración o escaneo corporal junto a Lami y retoma el debate cuando te sientas un poco más estable.",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    };
  };

  const guardarHistorial = async () => {
    try {
      const key = obtenerStorageKey();
      const raw = await AsyncStorage.getItem(key);
      const lista = raw ? JSON.parse(raw) : [];
<<<<<<< HEAD
      const interp = calcularInterpretacionPara(
        intensidadInicial,
        intensidadFinal
=======
      const interp = calcularOrientacionPara(
        intensidadInicial,
        intensidadFinal,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
      const nuevaLista = [nuevoRegistro, ...lista];
      await AsyncStorage.setItem(key, JSON.stringify(nuevaLista));
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
              const key = obtenerStorageKey();
              const filtrados = historial.filter((item) => item.id !== id);
              await AsyncStorage.setItem(key, JSON.stringify(filtrados));
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
=======

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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    }
  };

  const exportarActualAPDF = () => {
<<<<<<< HEAD
    const registroActual = {
=======
    const registroActual = ultimoRegistroGuardado || {
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    exportarAPDF([registroActual], "Diagnóstico Clínico ABCDE");
=======
    exportarAPDF([registroActual], "Autorregistro Cognitivo ABCDE");
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    setEtapa(1);
  };

  const interpretacion = calcularInterpretacionPara(
    intensidadInicial,
    intensidadFinal
  );

  return (
    <LinearGradient colors={["#F5F3FF", "#FDF2F8"]} style={styles.container}>
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
<<<<<<< HEAD
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
=======
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

>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
          <TouchableOpacity
            style={[
              styles.historyHeaderBtn,
              etapa === 4 && styles.historyHeaderBtnActive,
            ]}
            onPress={() => setEtapa(4)}
<<<<<<< HEAD
          >
            <Ionicons
              name="folder-open-outline"
              size={16}
              color={etapa === 4 ? "#FFF" : "#5B21B6"}
=======
            activeOpacity={0.85}
          >
            <Ionicons
              name="folder-open-outline"
              size={15}
              color={etapa === 4 ? "#FFF" : "#3F3B7A"}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
              </View>

              {/* PASO A */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
<<<<<<< HEAD
                  <View style={[styles.letterBadge, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={[styles.letterText, { color: "#1D4ED8" }]}>A</Text>
=======
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#E0F2FE" }]}
                  >
                    <Text style={[styles.letterText, { color: "#0369A1" }]}>
                      A
                    </Text>
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Acontecimiento Activador
                    </Text>
                    <Text style={styles.cardSub}>
<<<<<<< HEAD
                      ¿Qué hecho ocurrió o qué situación futura te preocupa?
=======
                      ¿Qué hecho ocurrió o qué situación te preocupa?
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
<<<<<<< HEAD
                  placeholder="Ej: Mañana tengo una exposición o siento que tengo demasiados pendientes..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: Mañana tengo una presentación o siento muchos pendientes..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={eventoA}
                  onChangeText={setEventoA}
                />
              </View>

              {/* PASO B */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
<<<<<<< HEAD
                  <View style={[styles.letterBadge, { backgroundColor: "#FEE2E2" }]}>
                    <Text style={[styles.letterText, { color: "#B91C1C" }]}>B</Text>
=======
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#FEE2E2" }]}
                  >
                    <Text style={[styles.letterText, { color: "#B91C1C" }]}>
                      B
                    </Text>
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Creencia o Pensamiento Automático
                    </Text>
                    <Text style={styles.cardSub}>
<<<<<<< HEAD
                      ¿Qué te dices a ti mismo/a sobre esa situación? ¿Qué es lo
                      peor que temes que pase?
=======
                      ¿Qué te dices a ti mismo/a sobre esa situación?
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
<<<<<<< HEAD
                  placeholder="Ej: 'Me voy a bloquear, todos notarán mis nervios y saldrá terrible'..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: 'Me voy a bloquear, todos lo notarán y saldrá mal'..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={creenciaB}
                  onChangeText={setCreenciaB}
                />

                <Text style={styles.subLabel}>
<<<<<<< HEAD
                  Selecciona la trampa mental (distorsión cognitiva) que más se
                  acerca a tu pensamiento:
=======
                  Identifica qué trampa mental se parece más a ese pensamiento:
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
=======
                      activeOpacity={0.85}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    >
                      <Text style={styles.distortionIcon}>{item.icono}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.distortionTitle,
<<<<<<< HEAD
                            activo && { color: "#5B21B6" },
=======
                            activo && { color: "#3F3B7A" },
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                          ]}
                        >
                          {item.titulo}
                        </Text>
                        <Text style={styles.distortionDesc}>{item.desc}</Text>
                      </View>
                      <Ionicons
                        name={activo ? "radio-button-on" : "radio-button-off"}
                        size={20}
<<<<<<< HEAD
                        color={activo ? "#7C3AED" : "#9CA3AF"}
=======
                        color={activo ? "#7E83C2" : "#94A3B8"}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* PASO C */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
<<<<<<< HEAD
                  <View style={[styles.letterBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.letterText, { color: "#B45309" }]}>C</Text>
=======
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#FEF3C7" }]}
                  >
                    <Text style={[styles.letterText, { color: "#B45309" }]}>
                      C
                    </Text>
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                  placeholder="Ej: Siento angustia, presión en el pecho, tensión en los hombros y ganas de evitarlo..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: Angustia, presión en el pecho, tensión en hombros..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={consecuenciaC}
                  onChangeText={setConsecuenciaC}
                />

                <Text style={styles.subLabel}>
<<<<<<< HEAD
                  Intensidad de tu ansiedad / malestar ahora mismo (1 al 10):
=======
                  Intensidad de tu malestar ahora (1 al 10):
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                style={styles.primaryBtn}
                onPress={avanzarAIntervencion}
              >
                <Text style={styles.primaryBtnText}>
                  Continuar a La Intervención (D - E) →
                </Text>
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
              </TouchableOpacity>
            </>
          )}

<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                </Text>
                <Text style={styles.quoteText}>"{creenciaB}"</Text>
              </View>

              {/* PASO D */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
<<<<<<< HEAD
                  <View style={[styles.letterBadge, { backgroundColor: "#EDE9FE" }]}>
                    <Text style={[styles.letterText, { color: "#6D28D9" }]}>D</Text>
=======
                  <View
                    style={[styles.letterBadge, { backgroundColor: "#EAE8FC" }]}
                  >
                    <Text style={[styles.letterText, { color: "#3F3B7A" }]}>
                      D
                    </Text>
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Debate / Disputa Racional
                    </Text>
                    <Text style={styles.cardSub}>
<<<<<<< HEAD
                      Cuestionemos con objetividad la validez de ese pensamiento.
=======
                      Pon a prueba el pensamiento con hechos objetivos.
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                  </View>
                </View>

                <Text style={styles.fieldQuestion}>
<<<<<<< HEAD
                  1. Debate: ¿Qué pruebas reales tienes de que esto
                  pasará exactamente como lo temes, o qué veces anteriores has
                  logrado salir adelante?
=======
                  1. Evidencia real: ¿Qué pruebas concretas tienes de que
                  ocurrirá lo peor, o qué veces anteriores lograste manejar algo
                  parecido?
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
<<<<<<< HEAD
                  placeholder="Ej: En realidad me he preparado antes y aunque me puse nervioso/a, pude terminar bien..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: En otras ocasiones sentí nervios al inicio, pero me preparé y logré terminar bien..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={debateEvidencia}
                  onChangeText={setDebateEvidencia}
                />

                <Text style={[styles.fieldQuestion, { marginTop: 12 }]}>
<<<<<<< HEAD
                  2. Perspectiva compasiva: Si alguien que quieres mucho tuviera
                  este mismo miedo, ¿qué le dirías?
=======
                  2. Mirada compasiva: Si alguien a quien aprecias tuviera este
                  mismo pensamiento, ¿qué le dirías?
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                </Text>
                <TextInput
                  style={styles.input}
                  multiline
<<<<<<< HEAD
                  placeholder="Ej: Le diría que equivocarse un poco es humano y no define su valor..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: Le diría que sentir nervios es normal y que no necesita hacerlo perfecto..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={debateAmigo}
                  onChangeText={setDebateAmigo}
                />
              </View>

              {/* PASO E */}
              <View style={styles.card}>
                <View style={styles.letterHeader}>
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  multiline
<<<<<<< HEAD
                  placeholder="Ej: 'Es normal sentir nervios, pero estoy preparado/a y puedo avanzar paso a paso sin exigirme perfección'..."
                  placeholderTextColor="#9CA3AF"
=======
                  placeholder="Ej: 'Es normal sentir inquietud, pero estoy preparado/a y puedo ir paso a paso'..."
                  placeholderTextColor="#94A3B8"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  value={efectoE}
                  onChangeText={setEfectoE}
                />

                <Text style={styles.subLabel}>
<<<<<<< HEAD
                  Después de debatir el pensamiento, ¿en qué nivel (1 al 10)
                  sientes tu ansiedad ahora? (Antes: {intensidadInicial}/10)
=======
                  Nivel de malestar después del debate (1 al 10) (Antes:{" "}
                  {intensidadInicial}/10):
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                  <Text style={styles.secondaryBtnText}>← Volver a A-B-C</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={avanzarAResultados}
                >
                  <Text style={styles.primaryBtnText}>
                    Ver Diagnóstico Final →
                  </Text>
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                </TouchableOpacity>
              </View>
            </>
          )}

<<<<<<< HEAD
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
=======
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

>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                <View style={styles.metricsBox}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Malestar Inicial (C)</Text>
                    <Text style={[styles.metricValue, { color: "#DC2626" }]}>
                      {intensidadInicial}/10
                    </Text>
                  </View>

<<<<<<< HEAD
                  <Ionicons name="arrow-forward" size={24} color="#6B7280" />
=======
                  <Ionicons name="arrow-forward" size={24} color="#6192A4" />
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)

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
<<<<<<< HEAD
                    🩺 Análisis Clínico:
=======
                    Orientación psicológica (TREC):
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.explicacion}
                  </Text>
                  <Text style={[styles.clinicalTitle, { marginTop: 10 }]}>
<<<<<<< HEAD
                    💡 Recomendación Terapéutica:
=======
                    Sugerencia práctica:
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                  <Text style={styles.clinicalBody}>
                    {interpretacion.recomendacion}
                  </Text>
                </View>
              </View>

<<<<<<< HEAD
              {/* RESUMEN DEL DIAGNÓSTICO ABCDE */}
              <View style={styles.card}>
                <Text style={styles.summaryHeaderTitle}>
                  📋 Resumen de tu Diagnóstico ABCDE
=======
              <View style={styles.card}>
                <Text style={styles.summaryHeaderTitle}>
                  Resumen de tu Autorregistro ABCDE
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                </Text>

                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryTag}>
<<<<<<< HEAD
                    I. El Diagnóstico (A - B - C)
=======
                    I. Registro Inicial (A - B - C)
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                    II. La Intervención (D - E)
=======
                    II. Debate y Nueva Respuesta (D - E)
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>• D (Evidencia racional): </Text>
                    {debateEvidencia}
                  </Text>
                  {debateAmigo.trim() ? (
                    <Text style={styles.summaryLine}>
<<<<<<< HEAD
                      <Text style={styles.bold}>• D (Visión compasiva): </Text>
=======
                      <Text style={styles.bold}>• D (Mirada compasiva): </Text>
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                      {debateAmigo}
                    </Text>
                  ) : null}
                  <Text style={styles.summaryLine}>
                    <Text style={styles.bold}>
<<<<<<< HEAD
                      • E (Nuevo pensamiento funcional):{" "}
=======
                      • E (Pensamiento equilibrado):{" "}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                    <Text style={{ color: "#065F46", fontWeight: "700" }}>
                      "{efectoE}"
                    </Text>
                  </Text>
                </View>
              </View>

<<<<<<< HEAD
              {/* BOTONES FINALES */}
              <View style={styles.footerBtns}>
                <TouchableOpacity
                  style={styles.saveBtn}
=======
              <View style={styles.footerBtns}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    guardado && { backgroundColor: "#0F766E" },
                  ]}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  onPress={guardarHistorial}
                  disabled={guardado}
                >
                  <Text style={styles.saveBtnText}>
                    {guardado
<<<<<<< HEAD
                      ? "Diagnóstico Guardado ✓"
                      : "Guardar en Tests Anteriores"}
=======
                      ? "Autorregistro guardado ✓"
                      : "Guardar autorregistro"}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={exportarActualAPDF}
<<<<<<< HEAD
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFF" />
                  <Text style={styles.pdfBtnText}>
                    Exportar este diagnóstico a PDF
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                      { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" },
=======
                      { backgroundColor: "#EAE8FC", borderColor: "#CEC7FD" },
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    ]}
                    onPress={() => setEtapa(4)}
                  >
                    <Text
<<<<<<< HEAD
                      style={[styles.secondaryBtnText, { color: "#5B21B6" }]}
                    >
                      Ver Tests Anteriores
=======
                      style={[styles.secondaryBtnText, { color: "#3F3B7A" }]}
                    >
                      Ver Historial
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
              </View>

              {historial.length > 0 && (
                <TouchableOpacity
                  style={[styles.pdfBtn, { marginBottom: 14 }]}
<<<<<<< HEAD
                  onPress={() =>
                    exportarAPDF(
                      historial,
                      "Historial Completo de Diagnósticos ABCDE"
=======
                  disabled={exportandoPDF}
                  onPress={() =>
                    exportarAPDF(
                      historial,
                      "Historial Completo de Autorregistros ABCDE",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                    )
                  }
                >
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.pdfBtnText}>
<<<<<<< HEAD
                    📄 Exportar todos los tests a PDF ({historial.length})
=======
                    {exportandoPDF
                      ? "Generando PDF..."
                      : `Exportar todo el historial a PDF (${historial.length})`}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                </TouchableOpacity>
              )}

              {historial.length === 0 ? (
<<<<<<< HEAD
                <View style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color="#C4B5FD"
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
<<<<<<< HEAD
                      color: "#374151",
                      marginTop: 10,
                    }}
                  >
                    Aún no tienes tests guardados
=======
                      color: "#1E3A4C",
                    }}
                  >
                    Aún no tienes registros guardados
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
<<<<<<< HEAD
                      color: "#6B7280",
=======
                      color: "#617D8A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                      textAlign: "center",
                      marginTop: 4,
                      marginBottom: 16,
                    }}
                  >
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  </TouchableOpacity>
                </View>
              ) : (
                historial.map((item, index) => {
                  const abierto = expandedId === item.id;
<<<<<<< HEAD
                  const interp = calcularInterpretacionPara(
                    item.intensidadInicial,
                    item.intensidadFinal
=======
                  const interp = calcularOrientacionPara(
                    item.intensidadInicial,
                    item.intensidadFinal,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                  );

                  return (
                    <View key={item.id} style={styles.card}>
                      <TouchableOpacity
                        style={styles.historyItemHeader}
<<<<<<< HEAD
                        onPress={() =>
                          setExpandedId(abierto ? null : item.id)
                        }
=======
                        onPress={() => setExpandedId(abierto ? null : item.id)}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                          color="#6B7280"
=======
                          color="#617D8A"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                        />
                      </TouchableOpacity>

                      {abierto && (
                        <View style={{ marginTop: 14 }}>
                          <View style={styles.summaryBlock}>
                            <Text style={styles.summaryTag}>
<<<<<<< HEAD
                              I. El Diagnóstico (A - B - C)
=======
                              I. Registro Inicial (A - B - C)
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                              II. La Intervención (D - E)
=======
                              II. Debate y Nueva Respuesta (D - E)
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                            </Text>
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>• D (Evidencia): </Text>
                              {item.debateEvidencia}
                            </Text>
                            {item.debateAmigo ? (
                              <Text style={styles.summaryLine}>
                                <Text style={styles.bold}>
<<<<<<< HEAD
                                  • D (Visión compasiva):{" "}
=======
                                  • D (Mirada compasiva):{" "}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                                </Text>
                                {item.debateAmigo}
                              </Text>
                            ) : null}
                            <Text style={styles.summaryLine}>
                              <Text style={styles.bold}>
<<<<<<< HEAD
                                • E (Pensamiento funcional):{" "}
=======
                                • E (Pensamiento equilibrado):{" "}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
                              🩺 Interpretación:
=======
                              Orientación:
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                            </Text>
                            <Text style={styles.clinicalBody}>
                              {interp.resumen} {interp.explicacion}
                            </Text>
                          </View>

                          <View style={[styles.rowBtns, { marginTop: 12 }]}>
                            <TouchableOpacity
<<<<<<< HEAD
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
=======
                              style={[styles.pdfSingleBtn, { flex: 1 }]}
                              disabled={exportandoPDF}
                              onPress={() =>
                                exportarAPDF(
                                  [item],
                                  `Autorregistro ABCDE - ${formatearFecha(
                                    item.fecha,
                                  )}`,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                                )
                              }
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={16}
<<<<<<< HEAD
                                color="#4C1D95"
=======
                                color="#3F3B7A"
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
                              />
                              <Text style={styles.pdfSingleBtnText}>
                                Exportar este PDF
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteBtn}
<<<<<<< HEAD
                              onPress={() => eliminarRegistro(item.id)}
=======
                              onPress={() => solicitarEliminarRegistro(item.id)}
                              activeOpacity={0.85}
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
        </ScrollView>
=======

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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    elevation: 2,
=======
    borderWidth: 1,
    borderColor: "#B3D3DA",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#7C3AED",
=======
    color: "#6192A4",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 19,
<<<<<<< HEAD
    fontWeight: "800",
    color: "#1F1147",
=======
    fontWeight: "900",
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  historyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
<<<<<<< HEAD
    backgroundColor: "#EDE9FE",
=======
    backgroundColor: "#EAE8FC",
    borderWidth: 1,
    borderColor: "#CEC7FD",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  historyHeaderBtnActive: {
<<<<<<< HEAD
    backgroundColor: "#7C3AED",
=======
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  historyHeaderBtnText: {
    fontSize: 11,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#5B21B6",
=======
    color: "#3F3B7A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  stepPillActive: {
    backgroundColor: "#7C3AED",
=======
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    alignItems: "center",
  },
  stepPillActive: {
    backgroundColor: "#7E83C2",
    borderColor: "#7E83C2",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "700",
<<<<<<< HEAD
    color: "#4B5563",
=======
    color: "#476475",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  stepPillTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    padding: 16,
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
<<<<<<< HEAD
    elevation: 2,
=======
    borderWidth: 1,
    borderColor: "#D6E8EE",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "700",
<<<<<<< HEAD
    color: "#374151",
=======
    color: "#2C4959",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginTop: 14,
    marginBottom: 8,
  },
  distortionItem: {
    flexDirection: "row",
    alignItems: "center",
<<<<<<< HEAD
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
=======
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2EEF2",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  distortionItemActive: {
<<<<<<< HEAD
    backgroundColor: "#F3E8FF",
    borderColor: "#8B5CF6",
  },
  distortionIcon: {
    fontSize: 22,
=======
    backgroundColor: "#EAE8FC",
    borderColor: "#7E83C2",
  },
  distortionIcon: {
    fontSize: 21,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  distortionTitle: {
    fontSize: 13,
    fontWeight: "700",
<<<<<<< HEAD
    color: "#1F2937",
  },
  distortionDesc: {
    fontSize: 11,
    color: "#6B7280",
=======
    color: "#1E3A4C",
  },
  distortionDesc: {
    fontSize: 11,
    color: "#617D8A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  scaleBtn: {
<<<<<<< HEAD
    width: 30,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
=======
    width: 29,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0F7F9",
    borderWidth: 1,
    borderColor: "#D6E8EE",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    justifyContent: "center",
    alignItems: "center",
  },
  scaleBtnActiveRed: {
    backgroundColor: "#EF4444",
<<<<<<< HEAD
  },
  scaleBtnActiveGreen: {
    backgroundColor: "#10B981",
=======
    borderColor: "#EF4444",
  },
  scaleBtnActiveGreen: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  scaleBtnText: {
    fontSize: 13,
    fontWeight: "700",
<<<<<<< HEAD
    color: "#374151",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    color: "#374151",
    marginBottom: 6,
  },
  primaryBtn: {
    backgroundColor: "#7C3AED",
=======
    color: "#2C4959",
    marginBottom: 6,
  },
  primaryBtn: {
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 6,
<<<<<<< HEAD
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
=======
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    borderWidth: 1,
    borderColor: "#D1D5DB",
=======
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  secondaryBtnText: {
<<<<<<< HEAD
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
<<<<<<< HEAD
    elevation: 3,
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
<<<<<<< HEAD
    backgroundColor: "#F9FAFB",
=======
    backgroundColor: "#F4F7FA",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
<<<<<<< HEAD
    color: "#6B7280",
=======
    color: "#617D8A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    color: "#1F2937",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginBottom: 12,
    lineHeight: 20,
  },
  clinicalBox: {
<<<<<<< HEAD
    backgroundColor: "#F5F3FF",
=======
    backgroundColor: "#EAE8FC",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    borderRadius: 16,
    padding: 14,
  },
  clinicalTitle: {
    fontSize: 13,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#4C1D95",
=======
    color: "#3F3B7A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginBottom: 4,
  },
  clinicalBody: {
    fontSize: 13,
<<<<<<< HEAD
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
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  summaryTag: {
    fontSize: 12,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#B45309",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryLine: {
    fontSize: 13,
<<<<<<< HEAD
    color: "#374151",
=======
    color: "#2C4959",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginBottom: 6,
    lineHeight: 19,
  },
  bold: {
    fontWeight: "700",
<<<<<<< HEAD
    color: "#111827",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  strikeText: {
    textDecorationLine: "line-through",
    color: "#991B1B",
  },
  footerBtns: {
    gap: 8,
<<<<<<< HEAD
  },
  saveBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    elevation: 2,
=======
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: "#0F766E",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    backgroundColor: "#6D28D9",
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 2,
=======
    backgroundColor: "#7E83C2",
    paddingVertical: 14,
    borderRadius: 999,
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
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
<<<<<<< HEAD
    color: "#6B7280",
=======
    color: "#617D8A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#1F2937",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    marginTop: 2,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  historyBadgeBox: {
<<<<<<< HEAD
    backgroundColor: "#F3E8FF",
=======
    backgroundColor: "#EAE8FC",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  historyScoreLabel: {
    fontSize: 10,
<<<<<<< HEAD
    color: "#6D28D9",
=======
    color: "#3F3B7A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    fontWeight: "700",
  },
  historyScoreValue: {
    fontSize: 13,
    fontWeight: "900",
<<<<<<< HEAD
    color: "#4C1D95",
=======
    color: "#1E3A4C",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  pdfSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
<<<<<<< HEAD
    backgroundColor: "#EDE9FE",
=======
    backgroundColor: "#EAE8FC",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
    paddingVertical: 11,
    borderRadius: 12,
  },
  pdfSingleBtnText: {
    fontSize: 13,
    fontWeight: "800",
<<<<<<< HEAD
    color: "#4C1D95",
=======
    color: "#3F3B7A",
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    padding: 11,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
<<<<<<< HEAD
=======
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
>>>>>>> 40c34cc (Soy dev mar y he actualizado pantallas, ejercicios y he modificado detalles)
});
