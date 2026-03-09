const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3018;
const BASE_PATH = '/excelmoodle';

// Configuración de middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(BASE_PATH, express.static('public'));

// Configuración de Multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    }
});

// Configuración de sesiones
app.use(session({
    secret: 'handhug2002', // Cambia esto por una clave segura
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // En producción debería ser true con HTTPS
}));

// Configuración de la conexión a MariaDB
const db = mysql.createConnection({
    host: 'localhost',
    user: 'usuarios_moodle', // Cambia por tu usuario de MariaDB
    password: 'b3l1ev3r', // Cambia por tu contraseña de MariaDB
    database: 'usuarios_moodle',
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a MariaDB: ', err);
        return;
    }
    console.log('Conectado a MariaDB');
    
    // Crear la tabla de usuarios si no existe
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createUsersTable, (err, result) => {
        if (err) {
            console.error('Error creando tabla usuarios: ', err);
        } else {
            console.log('Tabla de usuarios creada o ya existe');
        }
    });
    
    // Crear la tabla de datos de Excel si no existe
    const createExcelDataTable = `
        CREATE TABLE IF NOT EXISTS excel_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            boleta VARCHAR(50) NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            apellido_paterno VARCHAR(255) NOT NULL,
            apellido_materno VARCHAR(255) NOT NULL,
            grupo VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    db.query(createExcelDataTable, (err, result) => {
        if (err) {
            console.error('Error creando tabla excel_data: ', err);
        } else {
            console.log('Tabla de excel_data creada o ya existe');
        }
    });
});

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect(`${BASE_PATH}/login`);
    }
}

// Rutas
app.get('/', (req, res) => {
    res.redirect(BASE_PATH);
});

app.get(BASE_PATH, (req, res) => {
    if (req.session.userId) {
        res.redirect(`${BASE_PATH}/dashboard`);
    } else {
        res.redirect(`${BASE_PATH}/login`);
    }
});

app.get(`${BASE_PATH}/login`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get(`${BASE_PATH}/register`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get(`${BASE_PATH}/dashboard`, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get(`${BASE_PATH}/upload-excel`, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload-excel.html'));
});

app.get(`${BASE_PATH}/view-excel-data`, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-excel-data.html'));
});

// Ruta para registro de usuarios
app.post(`${BASE_PATH}/register`, async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        // Verificar si el usuario ya existe
        const checkUser = 'SELECT * FROM users WHERE username = ? OR email = ?';
        db.query(checkUser, [username, email], async (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Error del servidor' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Usuario o email ya existe' });
            }
            
            // Hashear la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insertar nuevo usuario
            const insertUser = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            db.query(insertUser, [username, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Error creando usuario' });
                }
                
                res.json({ success: true, message: 'Usuario registrado exitosamente' });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Ruta para login
app.post(`${BASE_PATH}/login`, (req, res) => {
    const { username, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
        
        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
        
        // Crear sesión
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, message: 'Login exitoso' });
    });
});

// Ruta para logout
app.post(`${BASE_PATH}/logout`, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error cerrando sesión' });
        }
        res.json({ success: true, message: 'Sesión cerrada' });
    });
});

// Ruta para obtener información del usuario actual
app.get(`${BASE_PATH}/api/user`, requireAuth, (req, res) => {
    const query = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, user: results[0] });
    });
});

// Ruta para procesar archivo Excel
app.post(`${BASE_PATH}/api/upload-excel`, requireAuth, upload.single('excelFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }
    
    try {
        // Leer el archivo Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            return res.status(400).json({ success: false, message: 'El archivo Excel está vacío' });
        }
        
        // Validar que las columnas requeridas existan
        const firstRow = jsonData[0];
        const requiredColumns = ['boleta', 'nombre', 'apellido paterno', 'apellido materno', 'grupo'];
        const actualColumns = Object.keys(firstRow).map(key => key.toLowerCase());
        
        // Buscar las columnas con diferentes variaciones
        const findColumn = (variations) => {
            for (let variation of variations) {
                const found = actualColumns.find(col => col.includes(variation));
                if (found) return Object.keys(firstRow)[actualColumns.indexOf(found)];
            }
            return null;
        };
        
        const boletaColumn = findColumn(['boleta', 'numero', 'id', 'codigo']);
        const nombreColumn = findColumn(['nombre', 'name', 'nombres']);
        const apellidoPaternoColumn = findColumn(['apellido paterno', 'paterno', 'ap paterno']);
        const apellidoMaternoColumn = findColumn(['apellido materno', 'materno', 'ap materno']);
        const grupoColumn = findColumn(['grupo', 'class', 'clase', 'seccion']);
        
        if (!boletaColumn || !nombreColumn || !apellidoPaternoColumn || !apellidoMaternoColumn || !grupoColumn) {
            return res.status(400).json({ 
                success: false, 
                message: `Columnas requeridas no encontradas. Se encontraron: ${Object.keys(firstRow).join(', ')}. Se requieren columnas que contengan: boleta, nombre, apellido paterno, apellido materno, grupo` 
            });
        }
        
        // Eliminar todos los registros anteriores de este usuario antes de insertar los nuevos
        const deleteQuery = 'DELETE FROM excel_data WHERE user_id = ?';
        db.query(deleteQuery, [req.session.userId], (err, deleteResult) => {
            if (err) {
                console.error('Error eliminando registros anteriores:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error eliminando registros anteriores: ' + err.message 
                });
            }
            
            const deletedCount = deleteResult.affectedRows;
            console.log(`Eliminados ${deletedCount} registros anteriores del usuario ${req.session.userId}`);
            
            // Procesar cada fila
            const results = [];
            let processedCount = 0;
            let errorCount = 0;

            // Normalizar texto: quitar tildes y convertir ñ/Ñ a n/N
            const normalizeText = (value) => {
                return String(value || '')
                    .trim()
                    .replace(/\s+/g, ' ')
                    .replace(/ñ/g, 'n')
                    .replace(/Ñ/g, 'N')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
            };
        
        // Función para procesar una fila
        const processRow = (row, callback) => {
            // Procesar boleta: convertir a string, limpiar espacios y manejar valores undefined/null
            let boleta = row[boletaColumn];
            if (boleta === undefined || boleta === null) {
                boleta = '';
            } else {
                boleta = String(boleta).trim().replace(/\s+/g, ' '); // Normalizar espacios múltiples
            }
            
            const nombre = normalizeText(row[nombreColumn]);
            const apellidoPaterno = normalizeText(row[apellidoPaternoColumn]);
            const apellidoMaterno = normalizeText(row[apellidoMaternoColumn]);
            const grupo = String(row[grupoColumn] || '').trim();
            
            // Validar que los campos no estén vacíos
            if (!boleta || !nombre || !apellidoPaterno || !apellidoMaterno || !grupo) {
                results.push({
                    boleta: boleta || 'N/A',
                    nombre: nombre || 'N/A',
                    apellidoPaterno: apellidoPaterno || 'N/A',
                    apellidoMaterno: apellidoMaterno || 'N/A',
                    grupo: grupo || 'N/A',
                    status: 'error',
                    message: 'Campos vacíos'
                });
                errorCount++;
                return callback();
            }
            
            // Validar formato de boleta (alfanumérico, permitir guiones y puntos)
            const boletaRegex = /^[a-zA-Z0-9\-\.\s]+$/;
            if (!boletaRegex.test(boleta)) {
                results.push({
                    boleta,
                    nombre,
                    apellidoPaterno,
                    apellidoMaterno,
                    grupo,
                    status: 'error',
                    message: 'Formato de boleta inválido (solo se permiten letras, números, guiones y puntos)'
                });
                errorCount++;
                return callback();
            }
            
            // Insertar en la base de datos
            const insertQuery = 'INSERT INTO excel_data (user_id, boleta, nombre, apellido_paterno,' +
             ' apellido_materno, grupo) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(insertQuery, [req.session.userId, boleta, nombre, apellidoPaterno,
                 apellidoMaterno, grupo], (err, result) => {
                if (err) {
                    console.error('Error insertando registro:', err);
                    results.push({
                        boleta,
                        nombre,
                        apellidoPaterno,
                        apellidoMaterno,
                        grupo,
                        status: 'error',
                        message: err.code === 'ER_DUP_ENTRY' ? 'Registro duplicado' : 'Error de base de datos'
                    });
                    errorCount++;
                } else {
                    results.push({
                        boleta,
                        nombre,
                        apellidoPaterno,
                        apellidoMaterno,
                        grupo,
                        status: 'success'
                    });
                    processedCount++;
                }
                callback();
            });
        };
        
        // Procesar todas las filas secuencialmente
        let currentIndex = 0;
        const processNext = () => {
            if (currentIndex >= jsonData.length) {
                // Todas las filas procesadas
                return res.json({
                    success: true,
                    message: `Procesamiento completado. ${processedCount} registros guardados, ${errorCount} errores. ${deletedCount > 0 ? `Se eliminaron ${deletedCount} registros anteriores.` : ''}`,
                    data: results,
                    summary: {
                        total: jsonData.length,
                        processed: processedCount,
                        errors: errorCount,
                        deleted: deletedCount
                    }
                });
            }
            
            processRow(jsonData[currentIndex], () => {
                currentIndex++;
                processNext();
            });
        };
        
        processNext();
        
        }); // Cierre del callback de DELETE
        
    } catch (error) {
        console.error('Error procesando archivo Excel:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error procesando el archivo Excel: ' + error.message 
        });
    }
});

// Ruta para obtener los datos de Excel del usuario actual
app.get(`${BASE_PATH}/api/excel-data`, requireAuth, (req, res) => {
    const query = `
        SELECT id, boleta, nombre, apellido_paterno, apellido_materno, grupo, created_at 
        FROM excel_data 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
    `;
    
    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error del servidor' });
        }
        
        res.json({ success: true, data: results });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});