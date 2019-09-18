import mongoose from "mongoose";
import validator from "validator";
import { UnauthorizedException } from "./../Exceptions/UnauthorizedException";
import message from "./../Constants/message.constant";
import { CryptoGenerator } from "./../Helpers/CryptoGenerator";
import { TokenGenerator } from "./../Helpers/TokenGenerator";

/**
 * Defining user schema
 */
const model = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: value => {
      if (!validator.isEmail(value)) {
        throw new UnauthorizedException(message.INVALID_EMAIL);
      }
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 7
  },
  phone: {
    type: String
  },
  tokens: [
    {
      token: {
        type: String,
        required: true
      }
    }
  ],
  role: {
    type: String,
    enum: ["admin", "user"],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  updatedAt: {
    type: Date,
    default: Date.now()
  }
});

model.pre("save", async function(next) {
  /**
   * เข้ารหัส password ก่อนทำการบันทึก model
   */
  const user = this;
  if (!user.isModified("password")) return next();
  user.password = await new CryptoGenerator(user.password).cryptoSync();
  next();
});

model.methods.generateAuthToken = async function() {
  /**
   * สร้าง auth token สำหรับ user
   */
  const user = this;
  const token = new TokenGenerator({ _id: user._id, email: user.email, role: user.role }).generate();
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

model.methods.removePasswordField = function() {
  const data = this.toObject();
  delete data.password;
  return data;
};

model.statics.findByCredentials = async (email, password) => {
  /**
   * ค้นหา user โดย email และ password
   */
  let user = await User.findOne({ email });

  if (!user) {
    throw new UnauthorizedException(message.INVALID_LOGIN_CREDENTIAL);
  }

  const isPasswordMatch = await new CryptoGenerator(
    password,
    user.password
  ).cryptoCompareSync();

  if (!isPasswordMatch) {
    throw new UnauthorizedException(message.INVALID_LOGIN_CREDENTIAL);
  }

  return user;
};

/**
 * Creating user collection
 */
const User = mongoose.model("User", model);

/**
 * Exporting module
 */
export default User;
