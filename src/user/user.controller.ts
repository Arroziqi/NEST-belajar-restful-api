import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RegisterUserRequest, UserResponse } from 'src/model/user.model';
import { UserService } from './user.service';
import { WebResponse } from 'src/model/web.model';

@Controller('/api/users')
export class UserController {
  constructor(private userService: UserService) {}
  @Post()
  @HttpCode(201)
  async register(
    @Body() request: RegisterUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    const response = await this.userService.register(request);
    return {
      data: response,
    };
  }
}
