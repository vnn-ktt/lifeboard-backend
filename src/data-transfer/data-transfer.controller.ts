import { Body, Controller, Get, Headers, HttpCode, HttpException, Post, Req, Header } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { DataTransferService } from './data-transfer.service';

/** All routes require the existing HTTP-only lifeboard.sid session. */
@ApiTags('Data import / export')
@ApiCookieAuth('lifeboard.sid')
@Controller()
export class DataTransferController {
  constructor(private readonly transfer: DataTransferService) {}

  @Post('imports/lifeboard-v1/validate')
  @Throttle({default:{limit:10,ttl:60_000}})
  @HttpCode(200)
  @ApiOperation({summary:'Dry-run a browser localStorage Lifeboard LifeState v1 snapshot. No DB or S3 changes.'})
  @ApiBody({schema:{type:'object',description:'Raw LifeState v1 JSON (the content of store.exportState()).'}})
  @ApiResponse({status:200,description:'Counts, snapshot hash, warnings and whether the target account is empty.'})
  @ApiResponse({status:422,description:'Invalid snapshot, broken reference, unsupported version or malformed image.'})
  validate(@Req() req:AuthenticatedRequest,@Body() snapshot:unknown) {
    return this.transfer.validate(req.auth.user.id,snapshot);
  }

  @Post('imports/lifeboard-v1')
  @Throttle({default:{limit:4,ttl:60_000}})
  @HttpCode(200)
  @ApiHeader({name:'X-Import-Confirmed',required:true,description:'Must be true, after explicit user approval in the client UI.'})
  @ApiHeader({name:'Idempotency-Key',required:false,description:'Stable client-generated key (8–128 safe characters). The snapshot hash also prevents duplicate imports.'})
  @ApiOperation({summary:'Import LifeState v1 once into an empty account, atomically; never overwrite existing personal data.'})
  @ApiBody({schema:{type:'object',description:'Raw LifeState v1 JSON, NOT a wrapper.'}})
  @ApiResponse({status:200,description:'Import receipt, counts and old-ID → UUID map. On retry imported=false.'})
  @ApiResponse({status:409,description:'Account not empty / conflicting idempotency key.'})
  @ApiResponse({status:428,description:'Explicit import confirmation header missing.'})
  import(@Req() req:AuthenticatedRequest,@Body() snapshot:unknown,
    @Headers('idempotency-key') key?:string,@Headers('x-import-confirmed') confirmed?:string) {
    if(confirmed!=='true')throw new HttpException({statusCode:428,code:'IMPORT_CONFIRMATION_REQUIRED',
      message:'Review dry-run and explicitly confirm the migration before importing.'},428);
    return this.transfer.import(req.auth.user.id,snapshot,key);
  }

  @Get('exports/lifeboard-v1')
  @Throttle({default:{limit:10,ttl:60_000}})
  @Header('Cache-Control','private, no-store')
  @Header('Content-Disposition','attachment; filename="lifeboard-backup-v1.json"')
  @ApiOperation({summary:'Export a complete LifeState v1 JSON, including embedded note images and archived custom quotes.'})
  @ApiResponse({status:200,description:'Frontend-compatible LifeState v1.'})
  @ApiResponse({status:413,description:'Backup exceeds 32 MB safety cap.'})
  export(@Req() req:AuthenticatedRequest) {
    return this.transfer.export(req.auth.user.id);
  }
}
