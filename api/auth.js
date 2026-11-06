module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');return res.status(410).json({error:'계정 기능은 현재 탭에서만 동작합니다. 서버에는 가입 정보를 저장하지 않습니다.'})};
