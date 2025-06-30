db.createCollection("plans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name","weeklyClasses","pricing","createdAt"],
      properties: {
        name: {
          enum: ["panda","grizzly","polar","full"],
          description: "Nombres de planes predefinidos"
        },
        weeklyClasses: {
          bsonType: "int",
          description: "Clases por semana (ej. panda = 2)"
        },
        pricing: {
          bsonType: "object",
          required: ["single","couple","group"],
          properties: {
            single: { bsonType: "double", description: "Precio por persona (single)" },
            couple: { bsonType: "double", description: "Precio por persona (couple)" },
            group:  { bsonType: "double", description: "Precio por persona (group)" }
          }
        },
        description: { bsonType: "string" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
