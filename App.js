import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';



import Anxiosimetro from './screens/anxiosimetro';
import Autoabrazo from "./screens/Autoabrazo";
import Calendario from './screens/calendario';
import CheckingScreen from './screens/CheckingScreen';
import Escaneo from './screens/Escaneo';
import InfoAnsiedad from "./screens/InfoAnsiedad";
import Inicio from './screens/inicio';
import Login from './screens/login';
import PantallaEjercicios from './screens/PantallaEjercicios';
import PantallaRapida from "./screens/PantallaRapida";
import PantallaTest from "./screens/PantallaTest";
import Perfil from './screens/perfil';
import Registro from './screens/registro';
import Respiracion from "./screens/Respiracion";
import Sentidos from "./screens/Sentidos";
import Test from './screens/test';
import TestDiario from './screens/TestDiario';
import TestPersonalidad from "./screens/TestPersonalidad";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Inicio"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Inicio" component={Inicio} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Registro" component={Registro} />
          <Stack.Screen name="Test" component={Test} />
          <Stack.Screen name="Anxiosimetro" component={Anxiosimetro} />
          <Stack.Screen name="Calendario" component={Calendario} />
          <Stack.Screen name="PantallaEjercicios" component={PantallaEjercicios} />
          <Stack.Screen name="Perfil" component={Perfil} />
          <Stack.Screen name="Checking" component={CheckingScreen}/>
          <Stack.Screen name="TestDiario" component={TestDiario}/>
          <Stack.Screen name="TestPersonalidad" component={TestPersonalidad} />
          <Stack.Screen name="PantallaRapida" component={PantallaRapida} />
          <Stack.Screen name="InfoAnsiedad" component={InfoAnsiedad} />

          <Stack.Screen name="PantallaTest" component={PantallaTest} />
          <Stack.Screen name="Respiracion" component={Respiracion} />
          <Stack.Screen name="Sentidos" component={Sentidos} />
          <Stack.Screen name="Autoabrazo" component={Autoabrazo} />
          <Stack.Screen name="Escaneo" component={Escaneo} />




        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

