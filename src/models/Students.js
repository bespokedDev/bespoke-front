db.createCollection("students", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "studentCode","name","dob","gender",
        "email","phone","address","city","country",
        "occupation","enrollmentDate","status","createdAt"
      ],
      properties: {
        studentCode: {
          bsonType: "string",
          description: "Código auto-generado (p.ej. STU-000123)"
        },
        name: {
          bsonType: "string"
        },
        dob: {
          bsonType: "date"
        },
        // age y seniority se calculan en la aplicación
        gender: {
          enum: ["male","female","other"]
        },
        representativeName: {
          bsonType: "string",
          description: "Nombre del representante (opcional)"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$"
        },
        phone: {
          bsonType: "string"
        },
        address: {
          bsonType: "string"
        },
        city: {
          bsonType: "string"
        },
        country: {
          bsonType: "string"
        },
        occupation: {
          bsonType: "string"
        },
        enrollmentDate: {
          bsonType: "date",
          description: "Fecha de inscripción"
        },
        language: {
          bsonType: "string",
          description: "Idioma a cursar"
        },
        startDate: {
          bsonType: "date",
          description: "Fecha de inicio de clases"
        },
        status: {
          enum: ["active","inactive"],
          description: "Estado de la cuenta"
        },
        notes: {
          bsonType: "array",
          description: "Anotaciones varias",
          items: {
            bsonType: "object",
            required: ["date","text"],
            properties: {
              date: { bsonType: "date" },
              text: { bsonType: "string" }
            }
          }
        },
        withdrawalDate: {
          bsonType: "date",
          description: "Fecha de retiro (opcional)"
        },
        withdrawalReason: {
          bsonType: "string",
          description: "Razón de retiro (opcional)"
        },
        createdAt: {
          bsonType: "date"
        }
      }
    }
  }
});
