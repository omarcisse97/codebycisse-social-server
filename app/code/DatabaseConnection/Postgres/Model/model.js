import pkg from 'pg';

const { Client } = pkg;

export class PSQL{
    constructor(){
        this.client = null;
        this.status = false;
        this.errors = [];
    }

    async createConnection(url){
        if(this.status === true){
            await this.disconnect();
        }
        if(this.client !== null){
            this.clearConnection();
        }
        this.client = new Client({
            connectionString: url
        });
        
    }

    getConnectionStatus(){
        return this.status;
    }
    async clearConnection(){
        if(this.status === true){
            await this.disconnect();
        }
        this.client = null;
    }
    async connect(){
        if(this.client !== null){
            if(this.status === true){
                await this.disconnect();
            }
            
            try{
                await this.client.connect();
                this.status = true;
            }catch(err){
                this.errors.push(err);
                this.status = false;
            }
        }
    }
    async disconnect(){
        if(this.status === true){
            try{
                await this.client.end();
                this.status = false;
            } catch(err){
                this.errors.push(err);
            }
        }
    }
    getErrors(){
        return this.errors;
    }
    async fetch(query){
        if(this.status === true){
            try{
                const res = await this.client.query(query);
                return {data: res.rows, error: ''};
            }catch(err){
                return {data: null, error: err};
            }
        }
    }

}