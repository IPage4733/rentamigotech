import { Schema, model, models, Document } from "mongoose";

// Define the interface for OwnerInterestForm document
interface IOwnerInterestForm extends Document {
  name: string;
  email: string;
  mobileNo: string;
  propertyName: string;
  locality: string;
  city: string;
}

// Define the OwnerInterestForm schema
const OwnerInterestFormSchema = new Schema<IOwnerInterestForm>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    mobileNo: {
      type: String,
      required: [true, "Mobile number is required"],
      match: [/^\+?\d{10,}$/, "Invalid phone number format"],
    },
    propertyName: {
      type: String,
      required: [true, "Property name is required"],
    },
    locality: {
      type: String,
      required: [true, "Locality is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Check if the model exists, if not create a new one
const OwnerInterestForm =
  models.OwnerInterestForm ||
  model<IOwnerInterestForm>("OwnerInterestForm", OwnerInterestFormSchema);

export default OwnerInterestForm;
