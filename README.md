# Product Backlog

---

### **HU-01 – Registro**  

**Como usuario nuevo**,  
quiero registrarme guardando mis datos en el dispositivo.  

**Criterios de aceptación:**  
- La app permite ingresar nombre, correo y contraseña.  
- Los datos se guardan en la base de datos.  
- Debe validar campos vacíos y formato de correo.  

**Prioridad:** Alta  
**Story Points:** 5  

---

### **HU-02 – Inicio de sesión**  


**Como usuario registrado**,  
quiero iniciar sesión en el dispositivo,  
para acceder a mis funciones personalizadas.  

**Criterios de aceptación:**  
- Se valida contra la información almacenada.  
- Si la contraseña es incorrecta, muestra error.  
- Permite cerrar sesión y volver a la pantalla de login.  

**Prioridad:** Alta  
**Story Points:** 3  

---

### **HU-03 – Iniciar contador del Ansiouslómetro**  


**Como usuario que quiere medir mi ansiedad**,  
quiero iniciar un contador de tiempo sin ansiedad (días, horas, minutos, segundos),  
para saber cuánto tiempo llevo estable e incentivarme.  

**Criterios de aceptación:**  
- El contador inicia cuando el usuario pulsa “No tengo ansiedad”.  
- Muestra tiempo en tiempo real (días:hh:mm:ss).  
- Se guarda localmente el timestamp de inicio para mantenerlo entre sesiones (si la app se cierra y vuelve a abrir).  

**Prioridad:** Alta  
**Story Points:** 8  

---

### **HU-04 – Reiniciar contador por episodio de ansiedad**  

**Como usuario**,  
quiero reiniciar mi contador si tengo ansiedad,  
para llevar un registro honesto de mis avances.  

**Criterios de aceptación:**  
- Botón “Tuve ansiedad” reinicia el contador a 0.  
- El sistema solicita confirmación antes de reiniciar.  
- Que se busque ayudar si sufro ansiedad.  

**Prioridad:** Alta  
**Story Points:** 5  

---

### **HU-05 – Ejercicios rápidos para reducir ansiedad**  


**Como usuario**,  
quiero ver una lista de ejercicios o técnicas de respiración disponibles,  
para calmarme cuando tenga un episodio y seguir recomendaciones confiables.  

**Criterios de aceptación:**  
- Debe incluir al menos 2 ejercicios con pasos claros.  
- Debe de tener audio para tener una mejor experiencia.  
- Debe de mostrar información sobre los ejercicios.  

**Prioridad:** Media  
**Story Points:** 5  

---

### **HU-06 – Calendario emocional**  


**Como usuario**,  
quiero registrar cómo me siento cada día desde un calendario,  
para visualizar mis patrones emocionales.  

**Criterios de aceptación:**  
- Permite seleccionar un día y elegir entre emociones predefinidas (feliz, ansioso, triste, neutro...).  
- El día cambia de color según la emoción seleccionada.  
- Tomar notas de como me siento ese día.  

**Prioridad:** Media  
**Story Points:** 5  

---

### **HU-07 – Ver historial emocional en el calendario**  


**Como usuario**,  
quiero ver símbolos o colores en el calendario que indiquen mi estado por día,  
para identificar fácilmente tendencias sin necesidad de persistencia remota.  

**Criterios de aceptación:**  
- Cada emoción tiene un color o ícono definido.  
- Al tocar un día marcado, muestra el detalle (nivel / nota).  
- Poder tener mas de 1 emoción predominante por día.  

**Prioridad:** Media  
**Story Points:** 8  

---

### **HU-08 – Test diario para saber el estado**  

**Como usuario**,  
quiero realizar un test,para evaluar mi estado y recibir orientación inmediata.  

**Criterios de aceptación:**  
- El cuestionario tiene mínimo 3 preguntas sencillas.    
- Preguntar que emoción predomina ese día.
- Si tengo ansiedad que me recomiende ejercicios.  

**Prioridad:** Media  
**Story Points:** 5  

---

### **HU-09 – Perfil del usuario**  


**Como usuario**,  
quiero ver y editar mis datos básicos guardados en el dispositivo,  
para mantener mi información actualizada.  

**Criterios de aceptación:**  
- Muestra nombre, correo y avatar.  
- Permite editar nombre.  
- Poder eliminar cuenta.
- Que me muestre información básica.

**Prioridad:** Media  
**Story Points:** 3  

---

### **HU-10 – Si sufro ansiedad que la app me ayude en el momento**  


**Como usuario**,  
quiero un acceso rápido a ejercicios o frases calmantes,  
para obtener apoyo inmediato cuando me siento mal.  

**Criterios de aceptación:**  
- Botón visible que abre recursos inmediatos.  
- Quiero sentirme apoyado.
- Que tenga audio  y valide mis logros.  

**Prioridad:** Baja  
**Story Points:** 2  


---
### **HU-11 – Creación de base de datos en la nube**  
 

**Como usuario**
quiero que la app tenga una base de datos en la nube,  
para que pueda guardar y consultar información.

**Criterios de aceptación:**  
- Se almacena solo la información necesaria (sin datos sensibles).  
- Permite guardar registros necesarios para la app. 
- Que tenga un sistema de autenticación. 

**Prioridad:** Alta  
**Story Points:** 5

---

### **HU-12 – Realización de test de personalidad dentro de la app**

**Como usuario**,  
quiero poder realizar un test de personalidad dentro de la app,  
para conocerme y explorar como actua mi ansiedad.

**Criterios de aceptación:**  
- El usuario puede acceder al test desde un botón visible en la pantalla.  
- El test contiene preguntas definidas y dinámicas.  
- Al finalizar el test, la app muestra un resultado.  

**Prioridad:** Media  
**Story Points:** 3  

---

### **HU-13 – Actualización general de la app para mejorar la experiencia del usuario**

**Como usuario**,  
quiero que la aplicación se actualice con nuevas mejoras y correcciones,  
para tener una experiencia más fluida, estable y útil dentro de la app.


### **Criterios de aceptación**
- La app debe incluir correcciones de errores reportados en versiones anteriores.  
- Las pantallas deben cargar más rápido tras la actualización.  
- La actualización debe de contar con mensajes de abvertencias en caso de eliminar cuenta.
- Agregar un sistema de notificaciones.   


**Prioridad:** Alta  
**Story Points:** 3

---