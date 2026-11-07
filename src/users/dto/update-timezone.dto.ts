import { registerDecorator } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { validIanaTimezone } from '@/utils/timezone';

function IsIanaTimezone(): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isIanaTimezone', target: target.constructor, propertyName: String(propertyName),
    validator: { validate: validIanaTimezone, defaultMessage: () => 'Expected a valid IANA timezone' },
  });
}

export class UpdateTimezoneDto {
  @ApiProperty({ example: 'Europe/Amsterdam' })
  @IsIanaTimezone()
  timezone!: string;
}
