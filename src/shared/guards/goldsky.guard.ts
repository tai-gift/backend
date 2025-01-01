import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class GoldskyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['goldsky-webhook-secret'] as string;

    if (!apiKey || !this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private isValidApiKey(apiKey: string): boolean {
    return this.configService.get<string>('GOLDSKY_API_KEY') === apiKey;
  }
}
