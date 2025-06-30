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
        scheduledDays: {
          bsonType: "array",
          minItems: 1,
          description: "Días de la semana (p.ej. ['Monday','Wednesday'])",
          items: {
            enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
          }
        },
        purchaseDate: { bsonType: "date" },
        pricePerStudent: { bsonType: "double" },
        totalAmount: { bsonType: "double" },
        status: {
          enum: ["active","cancelled"]
        },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
