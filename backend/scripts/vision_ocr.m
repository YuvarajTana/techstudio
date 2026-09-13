#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc < 2) {
            fprintf(stderr, "Missing image path.\n");
            return 2;
        }

        NSString *imagePath = [NSString stringWithUTF8String:argv[1]];
        NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
        CGImageRef cgImage = [image CGImageForProposedRect:NULL context:nil hints:nil];
        if (cgImage == NULL) {
            fprintf(stderr, "Unable to decode image.\n");
            return 3;
        }

        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        request.usesLanguageCorrection = YES;
        request.minimumTextHeight = 0.008;

        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
        NSError *requestError = nil;
        if (![handler performRequests:@[request] error:&requestError]) {
            fprintf(stderr, "Apple Vision OCR failed.\n");
            return 4;
        }

        NSMutableArray<NSMutableDictionary *> *items = [NSMutableArray array];
        for (VNRecognizedTextObservation *observation in request.results ?: @[]) {
            VNRecognizedText *candidate = [observation topCandidates:1].firstObject;
            if (candidate == nil || candidate.string.length == 0) {
                continue;
            }
            CGRect rectangle = observation.boundingBox;
            double x = MAX(0, MIN(1, rectangle.origin.x));
            double y = MAX(0, MIN(1, 1 - rectangle.origin.y - rectangle.size.height));
            double width = MAX(0.001, MIN(1 - x, rectangle.size.width));
            double height = MAX(0.001, MIN(1 - y, rectangle.size.height));
            NSDictionary *box = @{
                @"x": @(x),
                @"y": @(y),
                @"width": @(width),
                @"height": @(height),
            };
            NSMutableDictionary *item = [@{
                @"text": candidate.string,
                @"confidence": @(candidate.confidence),
                @"box": box,
                @"polygon": @[
                    @[@(x), @(y)],
                    @[@(x + width), @(y)],
                    @[@(x + width), @(y + height)],
                    @[@(x), @(y + height)],
                ],
                @"style": @{
                    @"fontFamilyGuess": @"Inter",
                    @"fontStyle": @"normal",
                    @"strokeWidth": @0,
                    @"letterSpacing": @0,
                    @"lineHeight": @1.2,
                    @"rotation": @0,
                },
            } mutableCopy];
            [items addObject:item];
        }

        [items sortUsingComparator:^NSComparisonResult(NSDictionary *first, NSDictionary *second) {
            NSDictionary *firstBox = first[@"box"];
            NSDictionary *secondBox = second[@"box"];
            double firstY = [firstBox[@"y"] doubleValue];
            double secondY = [secondBox[@"y"] doubleValue];
            if (fabs(firstY - secondY) > 0.02) {
                return firstY < secondY ? NSOrderedAscending : NSOrderedDescending;
            }
            double firstX = [firstBox[@"x"] doubleValue];
            double secondX = [secondBox[@"x"] doubleValue];
            return firstX < secondX ? NSOrderedAscending : NSOrderedDescending;
        }];

        NSMutableArray<NSString *> *lines = [NSMutableArray array];
        [items enumerateObjectsUsingBlock:^(NSMutableDictionary *item, NSUInteger index, BOOL *stop) {
            item[@"id"] = [NSString stringWithFormat:@"vision_%lu", (unsigned long)index + 1];
            item[@"readingOrder"] = @(index);
            [lines addObject:item[@"text"]];
        }];

        NSDictionary *payload = @{
            @"text": [lines componentsJoinedByString:@"\n"],
            @"language": @"und",
            @"items": items,
        };
        NSError *jsonError = nil;
        NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&jsonError];
        if (data == nil) {
            fprintf(stderr, "Unable to encode OCR result.\n");
            return 5;
        }
        [[NSFileHandle fileHandleWithStandardOutput] writeData:data];
    }
    return 0;
}
