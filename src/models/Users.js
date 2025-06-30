db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name","email","password","role","createdAt"],
      properties: {
        name: {
          bsonType: "string",
          description: "Nombre completo del admin"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "Correo válido"
        },
        password: {
          bsonType: "string",
          minLength: 8,
          description: "Hash de contraseña, mínimo 8 caracteres"
        },
        role: {
          enum: ["admin"],
          description: "Por ahora solo admins"
        },
        createdAt: {
          bsonType: "date",
          description: "Fecha de creación del usuario"
        }
      }
    }
  }
});
