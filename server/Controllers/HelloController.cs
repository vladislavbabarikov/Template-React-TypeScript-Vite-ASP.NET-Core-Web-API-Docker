using Microsoft.AspNetCore.Mvc;
namespace server.Controllers;
[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase { [HttpGet] public object Get() => new { message = "ok" }; }
