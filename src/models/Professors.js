db.createCollection("professors", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name","ciNumber","dob","address","email","phone","occupation",
        "startDate","emergencyContact","typeId","paymentData","createdAt"
      ],
      properties: {
        name: {
          bsonType: "string",
          description: "Nombre completo"
        },
        ciNumber: {
          bsonType: "string",
          pattern: "^[0-9]+$",
          description: "Cédula (solo dígitos)"
        },
        dob: {
          bsonType: "date",
          description: "Fecha de nacimiento"
        },
        address: {
          bsonType: "string",
          description: "Dirección completa"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "Correo válido"
        },
        phone: {
          bsonType: "string",
          description: "Teléfono de contacto"
        },
        occupation: {
          bsonType: "string",
          description: "Ocupación"
        },
        typeId: {
          bsonType: "objectId",
          description: "Referencia a professorTypes._id"
        },
        startDate: {
          bsonType: "date",
          description: "Fecha de inicio como profesor"
        },
        emergencyContact: {
          bsonType: "object",
          required: ["name","phone"],
          properties: {
            name: {
              bsonType: "string",
              description: "Nombre contacto de emergencia"
            },
            phone: {
              bsonType: "string",
              description: "Teléfono de emergencia"
            }
          }
        },
        paymentData: {
          bsonType: "array",
          minItems: 1,
          maxItems: 3,
          description: "Hasta 3 opciones de pago",
          items: {
            bsonType: "object",
            required: [
              "_id","bankName","accountType","accountNumber",
              "holderName","holderCI","holderEmail",
              "holderAddress","routingNumber"
            ],
            properties: {
              _id: {
                bsonType: "objectId",
                description: "ID único de esta forma de pago"
              },
              bankName: {
                bsonType: "string",
                description: "Banco (se mostrará en dropdown)"
              },
              accountType: {
                bsonType: "string",
                description: "Tipo de cuenta"
              },
              accountNumber: {
                bsonType: "string",
                description: "Número de cuenta"
              },
              holderName: {
                bsonType: "string",
                description: "Nombre del titular"
              },
              holderCI: {
                bsonType: "string",
                description: "Cédula del titular"
              },
              holderEmail: {
                bsonType: "string",
                pattern: "^.+@.+$",
                description: "Correo del titular"
              },
              holderAddress: {
                bsonType: "string",
                description: "Dirección del titular"
              },
              routingNumber: {
                bsonType: "string",
                description: "Número de enrutamiento"
              }
            }
          }
        },
        createdAt: {
          bsonType: "date",
          description: "Fecha de creación del perfil"
        }
      }
    }
  }
});
