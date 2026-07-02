using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Nén/resize ảnh trước khi nhúng vào email. Ảnh điện thoại thường 3-8MB/tấm,
    /// nhúng inline (base64) còn phồng thêm ~33% nên dễ vượt giới hạn 25MB của SMTP.
    /// Ảnh xác nhận xe không cần độ phân giải gốc → resize + nén JPEG cho nhẹ.
    /// </summary>
    public static class ImageCompressionHelper
    {
        // Cạnh dài tối đa (px) và chất lượng JPEG đầu ra.
        private const int MaxDimension = 1280;
        private const int JpegQuality = 75;

        /// <summary>
        /// Đọc ảnh từ stream, resize về tối đa 1280px cạnh dài (chỉ thu nhỏ, không phóng to)
        /// và trả về JPEG đã nén. Kết quả luôn là image/jpeg.
        /// </summary>
        public static async Task<byte[]> CompressToJpegAsync(System.IO.Stream input)
        {
            using var image = await Image.LoadAsync(input);

            if (image.Width > MaxDimension || image.Height > MaxDimension)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(MaxDimension, MaxDimension)
                }));
            }

            using var output = new System.IO.MemoryStream();
            await image.SaveAsJpegAsync(output, new JpegEncoder { Quality = JpegQuality });
            return output.ToArray();
        }
    }
}
