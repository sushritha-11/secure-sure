module.exports=(err,req,res,next)=>{console.error(`[ERROR] ${req.method} ${req.originalUrl}`,err.message);res.status(err.status||500).json({message:err.message||'Internal server error'})};
