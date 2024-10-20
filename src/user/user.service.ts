import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  LoginUserRequest,
  RegisterUserRequest,
  UpdateUserRequest,
  UserResponse,
} from 'src/model/user.model';
import { Logger } from 'winston';
import { UserValidation } from './user.validation';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}
  async register(request: RegisterUserRequest): Promise<UserResponse> {
    this.logger.debug(`Register new user: ${JSON.stringify(request)}`);
    const validatedRequest: RegisterUserRequest =
      this.validationService.validate(UserValidation.REGISTER, request);

    const duplicateUsernameCount = await this.prismaService.user.count({
      where: {
        username: validatedRequest.username,
      },
    });

    if (duplicateUsernameCount != 0) {
      throw new HttpException('Username already exists', 400);
    }

    validatedRequest.password = await bcrypt.hash(
      validatedRequest.password,
      10,
    );

    const user = await this.prismaService.user.create({
      data: validatedRequest,
    });

    return {
      username: user.username,
      name: user.name,
    };
  }
  async login(request: LoginUserRequest): Promise<UserResponse> {
    this.logger.debug(`Login user: ${JSON.stringify(request)}`);
    // validation
    const validatedRequest: LoginUserRequest = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    );
    // get user
    const user = await this.prismaService.user.findUnique({
      where: {
        username: validatedRequest.username,
      },
    });
    // error handler if user not found
    if (!user) {
      throw new HttpException('Username or password is wrong', 400);
    }
    // compare password
    const isMatch = await bcrypt.compare(
      validatedRequest.password,
      user.password,
    );
    // error handler if password not match
    if (!isMatch) {
      throw new HttpException('Username or password is wrong', 400);
    }
    // generate token
    const token = uuid();
    // update user token
    await this.prismaService.user.update({
      where: {
        username: user.username,
      },
      data: {
        token: token,
      },
    });
    // return user
    return {
      username: user.username,
      name: user.name,
      token: user.token,
    };
  }
  async get(user: User): Promise<UserResponse> {
    return {
      username: user.username,
      name: user.name,
    };
  }
  async update(user: User, request: UpdateUserRequest): Promise<UserResponse> {
    this.logger.debug(
      `UserService.update( ${JSON.stringify(user)} , ${JSON.stringify(request)} )`,
    );
    const validatedRequest: UpdateUserRequest = this.validationService.validate(
      UserValidation.UPDATE,
      request,
    );
    if (validatedRequest.name) {
      user.name = validatedRequest.name;
    }
    if (validatedRequest.password) {
      user.password = await bcrypt.hash(validatedRequest.password, 10);
    }
    const response = await this.prismaService.user.update({
      where: {
        username: user.username,
      },
      data: user,
    });
    return {
      username: response.username,
      name: response.name,
    };
  }
  async logout(user: User): Promise<UserResponse> {
    this.logger.debug(`UserService.logout( ${JSON.stringify(user)} )`);
    const response = await this.prismaService.user.update({
      where: {
        username: user.username,
      },
      data: {
        token: null,
      },
    });
    return {
      username: response.username,
      name: response.name,
    };
  }
}
