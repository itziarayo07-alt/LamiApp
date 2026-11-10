import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

//base de datos 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';





const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_HEIGHT < 700;


export default function Login({navigation}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      //  Necesitas importar esto: signInWithEmailAndPassword
      await signInWithEmailAndPassword(auth, email, password);

      Alert.alert('Éxito', 'Bienvenid@ 💜');

      // Navegar a Test después del login exitoso
      navigation.replace('Test');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#fdf2ff', '#e0f2fe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/*Esto hace que la pantalla se mueva con el teclado */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ENCABEZADO */}
            <Text style={styles.appName}>Anxiously 💜</Text>
            <Text style={styles.title}>Bienvenida de nuevo</Text>
            <Text style={styles.subtitle}>
              Este es tu espacio seguro para respirar y sentirte mejor.
            </Text>

            {/* CHIPS MOTIVACIONALES */}
            <View style={styles.chipsRow}>
              <View style={[styles.chip, { backgroundColor: '#ede9fe' }]}>
                <Text style={styles.chipText}>Respira profundo 🌬️</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: '#fee2e2' }]}>
                <Text style={styles.chipText}>Sé amable contigo 💕</Text>
              </View>
            </View>

            {/* TARJETA DEL FORMULARIO */}
            <View style={styles.card}>
              {/* Imagen */}
              <Image
                source={require('../assets/ilustrar.jpg')}
                style={styles.image}
              />

              {/* TÍTULO DENTRO DEL CARD */}
              <Text style={styles.cardTitle}>Iniciar sesión</Text>
              <Text style={styles.cardSubtitle}>
                Ingresa tus datos para continuar con tu proceso de calma.
              </Text>

              {/* Input correo */}
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="email"
                  size={20}
                  color="#7C3AED"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="Correo electrónico o número"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              {/* Input contraseña */}
              <View style={styles.inputBox}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#7C3AED"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              {/* Botón iniciar sesión */}
              <TouchableOpacity
                onPress={handleLogin}
                style={styles.buttonContainer}
              >
                <LinearGradient
                  colors={['#5B0EAD', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Frase pequeña */}
              <Text style={styles.helperText}>
                🌸 Recuerda: no tienes que estar perfecta para empezar, solo
                presente.
              </Text>

              {/* Footer registrar */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>¿Aún no tienes una cuenta? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Registro')}
                >
                  <Text style={styles.register}>Registrarse</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: isSmallDevice ? 20 : 32,
    paddingBottom: 40, // un extra para que pueda subir sobre el teclado
  },

  // TEXTOS ARRIBA
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4C1D95',
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },

  // CHIPS SUPERIORES
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
  },

  // CARD
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: isSmallDevice ? 18 : 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  image: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.55,
    maxHeight: 260,
    alignSelf: 'center',
    resizeMode: 'contain',
    marginBottom: isSmallDevice ? 8 : 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'left',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },

  // INPUTS
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  // BOTÓN
  buttonContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  helperText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 2,
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 13,
  },
  register: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 13,
  },
});
