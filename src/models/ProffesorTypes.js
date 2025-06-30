db.createCollection("professorTypes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name","rates","createdAt"],
      properties: {
        name: {
          enum: ["normal","plus"],
          description: "Tipo de profesor"
        },
        rates: {
          bsonType: "object",
          required: ["single","couple","group"],
          properties: {
            single: { bsonType: "double", description: "tarifa $/hora para single" },
            couple: { bsonType: "double", description: "tarifa $/hora para couple" },
            group:  { bsonType: "double", description: "tarifa $/hora para group" }
          }
        },
        createdAt: {
          bsonType: "date",
          description: "Fecha de creación del tipo"
        }
      }
    }
  }
})

/*{ name:"normal", rates:{ single:7, couple:8.5, group:10 }, createdAt:new Date() }
{ name:"plus",   rates:{ single:8, couple:9,   group:10.5 }, createdAt:new Date() }
 */