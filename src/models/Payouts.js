db.createCollection("payouts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "professorId","month","details","subtotal",
        "discount","total","paymentMethodId","paidAt","createdAt"
      ],
      properties: {
        professorId: {
          bsonType: "objectId",
          description: "Referencia a professors._id"
        },
        month: {
          bsonType: "string",
          pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$",
          description: "Periodo YYYY-MM"
        },
        details: {
          bsonType: "array",
          description: "Desglose por estudiante",
          items: {
            bsonType: "object",
            required: [
              "enrollmentId","hoursTaught","totalPerStudent"
            ],
            properties: {
              enrollmentId: { bsonType: "objectId", description: "→ enrollments._id" },
              hoursTaught:    { bsonType: "int" },
              totalPerStudent:{ bsonType: "double" }
            }
          }
        },
        subtotal: { bsonType: "double" },
        discount: { bsonType: "double", description: "Descuento (incidencias)" },
        total: { bsonType: "double" },
        paymentMethodId: {
          bsonType: "objectId",
          description: "→ professors.paymentData._id"
        },
        paidAt:    { bsonType: "date" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
