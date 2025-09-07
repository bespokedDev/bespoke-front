db.createCollection("enrollments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "planId","studentIds","professorId","enrollmentType",
        "scheduledDays","purchaseDate","pricePerStudent",
        "totalAmount","status","createdAt"
      ],
      properties: {
        planId: {
          bsonType: "objectId",
          description: "Referencia a plans._id"
        },
        studentIds: {
          bsonType: "array",
          minItems: 1,
          description: "IDs de estudiantes en esta matrícula",
          items: { bsonType: "objectId" }
        },
        professorId: {
          bsonType: "objectId",
          description: "Referencia a professors._id"
        },
        enrollmentType: {
          enum: ["single","couple","group"]
        },
        // 👇 NUEVO CAMPO
        alias: {
          bsonType: "string",
          description: "Alias del enrollment (solo para couple o group)",
          maxLength: 100
        },
        scheduledDays: {
          bsonType: "array",
          minItems: 1,
          description: "Días de la semana programados",
          items: {
            bsonType: "object",
            required: ["day"],
            properties: {
              day: {
                enum: ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
              }
            }
          }
        },
        purchaseDate: { bsonType: "date" },
        startDate: { bsonType: "date" },
        pricePerStudent: { bsonType: "double" },
        totalAmount: { bsonType: "double" },
        status: {
          enum: [1, 0, 2],
          description: "1=activo, 0=inactivo, 2=pausado"
        },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
