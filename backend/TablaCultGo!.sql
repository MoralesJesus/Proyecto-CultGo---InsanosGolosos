CREATE TABLE eventos_cultgo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    artista VARCHAR(255) NOT NULL,
    genero VARCHAR(100),
    fecha VARCHAR(20), -- Se usa VARCHAR para conservar tu formato 'DD/MM/YYYY'
    hora VARCHAR(20),
    lugar VARCHAR(255),
    direccion VARCHAR(255),
    latitud DECIMAL(10, 6),
    longitud DECIMAL(10, 6),
    descripcion TEXT
);}
