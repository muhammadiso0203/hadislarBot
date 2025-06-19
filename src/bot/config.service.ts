import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService{
    get adminID(): number{
        return Number(process.env.ADMIN_ID)
    }
}