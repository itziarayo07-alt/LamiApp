import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Inicio({ navigation }) {
  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/logo.png')} 
        style={styles.background}
        resizeMode="cover" // ocupa toda la pantalla
      >
        <View style={styles.overlay}>
       

          {/* Espacio flexible para empujar el botón hacia abajo */}
          <View style={{ flex: 1 }} />

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Comenzar</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { 
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  overlay: { 
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end', // empuja el botón hacia abajo
    alignItems: 'center',
    paddingBottom: 50,           // espacio desde el borde inferior
    backgroundColor: 'rgba(255,255,255,0.3)' // ligero velo sobre la imagen
  },
  title: { 
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3c3c3c',
    marginTop: 50,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  button: {
    backgroundColor: '#c084fc', // color lila
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    elevation: 4, // sombra Android
    shadowColor: '#000', // sombra iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
});
