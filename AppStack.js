import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Anxiosimetro from '../screens/anxiosimetro';
import Autoabrazo from '../screens/Autoabrazo';
import Calendario from '../screens/calendario';
import Escaneo from '../screens/Escaneo';
import InfoAnsiedad from '../screens/InfoAnsiedad';
import PantallaEjercicios from '../screens/PantallaEjercicios';
import PantallaRapida from '../screens/PantallaRapida';
import Perfil from '../screens/perfil';
import Respiracion from '../screens/Respiracion';
import Sentidos from '../screens/Sentidos';
import Test from '../screens/test';
import TestDiario from '../screens/TestDiario';
import TestPersonalidad from '../screens/TestPersonalidad';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Test" component={Test} />
      <Stack.Screen name="Perfil" component={Perfil} />
      <Stack.Screen name="Anxiosimetro" component={Anxiosimetro} />
      <Stack.Screen name="Calendario" component={Calendario} />
      <Stack.Screen name="PantallaEjercicios" component={PantallaEjercicios} />
      <Stack.Screen name="PantallaRapida" component={PantallaRapida} />
      <Stack.Screen name="TestDiario" component={TestDiario} />
      <Stack.Screen name="TestPersonalidad" component={TestPersonalidad} />
      <Stack.Screen name="InfoAnsiedad" component={InfoAnsiedad} />
      <Stack.Screen name="Respiracion" component={Respiracion} />
      <Stack.Screen name="Sentidos" component={Sentidos} />
      <Stack.Screen name="Autoabrazo" component={Autoabrazo} />
      <Stack.Screen name="Escaneo" component={Escaneo} />
    </Stack.Navigator>
  );
}
